/**
 * A minimal companion fixture component used to prove ForgeGate reports more
 * than one real component from the same repository.
 *
 * @slot header - Optional heading content.
 * @slot - Main card body.
 * @csspart container - The outer card container.
 */
export class AcmeCard extends HTMLElement {
  static get observedAttributes() {
    return ['tone'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  /** Visual tone: "neutral" or "accent". */
  get tone() {
    return this.getAttribute('tone') ?? 'neutral';
  }

  set tone(value) {
    this.setAttribute('tone', value);
  }

  render() {
    const section = document.createElement('section');
    section.part.add('container');
    section.className = `tone-${this.tone}`;

    const header = document.createElement('slot');
    header.name = 'header';
    const body = document.createElement('slot');

    section.append(header);
    section.append(body);
    this.replaceChildren(section);
  }
}

customElements.define('acme-card', AcmeCard);
