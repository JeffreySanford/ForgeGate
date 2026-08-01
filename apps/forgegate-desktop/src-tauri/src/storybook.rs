use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::time::Duration;

const CONNECT_READ_TIMEOUT: Duration = Duration::from_secs(5);

/// Only a plain `http://localhost:<port>` or `http://127.0.0.1:<port>`
/// origin, and nothing else, is a real local Storybook dev/preview
/// server this command should ever connect to — no remote hosts, no
/// paths, no query strings, no scheme other than plain HTTP (a local
/// dev server has no TLS certificate to verify anyway).
pub(crate) fn is_safe_local_storybook_origin(origin: &str) -> bool {
    let Some(rest) = origin.strip_prefix("http://") else {
        return false;
    };
    let Some((host, port)) = rest.split_once(':') else {
        return false;
    };
    if host != "localhost" && host != "127.0.0.1" {
        return false;
    }
    !port.is_empty() && port.chars().all(|c| c.is_ascii_digit()) && port.parse::<u16>().is_ok()
}

/// Fetches and returns the raw JSON body of `<origin>/index.json` — a
/// running local Storybook server's own real story index, per
/// documentation/06-storybook-integration.md's "Discovery" ("a local
/// Storybook development server" as a supported source) — not the
/// `storybook-static/index.json` file already read from disk elsewhere.
///
/// Hand-rolled over a plain `TcpStream` rather than adding an HTTP
/// client dependency: this is a single unauthenticated localhost GET for
/// a JSON response, not a general-purpose HTTP client. Only
/// `Content-Length`-declared responses are supported today; a chunked
/// response is reported as a real, named limitation rather than silently
/// mishandled.
pub(crate) fn fetch_storybook_index(origin: &str) -> Result<String, String> {
    if !is_safe_local_storybook_origin(origin) {
        return Err(format!(
            "\"{origin}\" is not a real local Storybook origin (only http://localhost:<port> or http://127.0.0.1:<port> are allowed)"
        ));
    }
    let host_port = origin
        .strip_prefix("http://")
        .expect("already validated by is_safe_local_storybook_origin");

    let mut stream = TcpStream::connect(host_port)
        .map_err(|error| format!("Could not connect to {origin}: {error}"))?;
    stream
        .set_read_timeout(Some(CONNECT_READ_TIMEOUT))
        .map_err(|error| format!("Failed to configure connection to {origin}: {error}"))?;
    stream
        .set_write_timeout(Some(CONNECT_READ_TIMEOUT))
        .map_err(|error| format!("Failed to configure connection to {origin}: {error}"))?;

    let request = format!(
        "GET /index.json HTTP/1.1\r\nHost: {host_port}\r\nConnection: close\r\nAccept: application/json\r\n\r\n"
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| format!("Failed to send request to {origin}: {error}"))?;

    let mut reader = BufReader::new(stream);
    let mut status_line = String::new();
    reader
        .read_line(&mut status_line)
        .map_err(|error| format!("Failed to read response from {origin}: {error}"))?;
    if !status_line.contains(" 200 ") && !status_line.trim_end().ends_with(" 200") {
        return Err(format!(
            "Storybook at {origin} returned: {}",
            status_line.trim()
        ));
    }

    let mut content_length: Option<usize> = None;
    loop {
        let mut line = String::new();
        let bytes_read = reader
            .read_line(&mut line)
            .map_err(|error| format!("Failed to read response headers from {origin}: {error}"))?;
        if bytes_read == 0 || line == "\r\n" || line == "\n" {
            break;
        }
        let lower = line.to_ascii_lowercase();
        if let Some(value) = lower.strip_prefix("content-length:") {
            content_length = value.trim().parse().ok();
        }
    }

    let Some(length) = content_length else {
        return Err(format!(
            "Storybook at {origin} did not report a Content-Length; chunked responses are not supported yet"
        ));
    };

    let mut body = vec![0u8; length];
    reader
        .read_exact(&mut body)
        .map_err(|error| format!("Failed to read response body from {origin}: {error}"))?;

    String::from_utf8(body)
        .map_err(|error| format!("Storybook at {origin} returned non-UTF-8 content: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::thread;

    #[test]
    fn is_safe_local_storybook_origin_accepts_and_rejects_the_expected_shapes() {
        assert!(is_safe_local_storybook_origin("http://localhost:6006"));
        assert!(is_safe_local_storybook_origin("http://127.0.0.1:6006"));
        assert!(!is_safe_local_storybook_origin("https://localhost:6006"));
        assert!(!is_safe_local_storybook_origin("http://example.com:6006"));
        assert!(!is_safe_local_storybook_origin("http://localhost"));
        assert!(!is_safe_local_storybook_origin(
            "http://localhost:6006/index.json"
        ));
        assert!(!is_safe_local_storybook_origin("http://localhost:abc"));
        assert!(!is_safe_local_storybook_origin(""));
    }

    /// Starts a real local TCP listener that responds to exactly one
    /// connection with `body` as a `200 OK` JSON response, then returns
    /// the real `http://127.0.0.1:<port>` origin it's listening on.
    ///
    /// Drains the client's real request before writing the response and
    /// letting the socket drop: on Windows, dropping a socket while the
    /// peer's already-sent request bytes are still unread in the kernel
    /// receive buffer sends a real RST instead of a graceful close,
    /// which can arrive mid-read on the client side and surface as a
    /// spurious "connection forcibly closed" error — a real race this
    /// test caught when run in parallel with the rest of the suite,
    /// not something to paper over with a retry.
    fn spawn_real_local_server(body: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").expect("should bind an ephemeral port");
        let port = listener.local_addr().expect("should have a local addr").port();
        thread::spawn(move || {
            if let Ok((socket, _)) = listener.accept() {
                let mut reader = BufReader::new(socket);
                let mut line = String::new();
                loop {
                    line.clear();
                    match reader.read_line(&mut line) {
                        Ok(0) | Err(_) => break,
                        Ok(_) if line == "\r\n" || line == "\n" => break,
                        Ok(_) => {}
                    }
                }
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = reader.get_mut().write_all(response.as_bytes());
            }
        });
        format!("http://127.0.0.1:{port}")
    }

    #[test]
    fn fetches_the_real_index_json_body_from_a_real_local_server() {
        let origin = spawn_real_local_server(r#"{"v":5,"entries":{}}"#);

        let result = fetch_storybook_index(&origin).expect("fetch should succeed");

        assert_eq!(result, r#"{"v":5,"entries":{}}"#);
    }

    #[test]
    fn refuses_to_fetch_from_a_non_local_origin() {
        let result = fetch_storybook_index("http://example.com:6006");
        assert!(result.is_err());
    }

    #[test]
    fn reports_a_real_connection_failure_for_a_port_nothing_is_listening_on() {
        // Bind then immediately drop, freeing the port but making it very
        // unlikely anything else grabbed it in between.
        let listener = TcpListener::bind("127.0.0.1:0").expect("should bind an ephemeral port");
        let port = listener.local_addr().expect("should have a local addr").port();
        drop(listener);

        let result = fetch_storybook_index(&format!("http://127.0.0.1:{port}"));

        assert!(result.is_err());
    }

    #[test]
    fn reports_a_non_200_response_status_as_a_real_error() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("should bind an ephemeral port");
        let port = listener.local_addr().expect("should have a local addr").port();
        thread::spawn(move || {
            if let Ok((socket, _)) = listener.accept() {
                let mut reader = BufReader::new(socket);
                let mut line = String::new();
                loop {
                    line.clear();
                    match reader.read_line(&mut line) {
                        Ok(0) | Err(_) => break,
                        Ok(_) if line == "\r\n" || line == "\n" => break,
                        Ok(_) => {}
                    }
                }
                let _ = reader
                    .get_mut()
                    .write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
            }
        });

        let result = fetch_storybook_index(&format!("http://127.0.0.1:{port}"));

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("404"));
    }
}
