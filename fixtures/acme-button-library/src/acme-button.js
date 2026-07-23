/**
 * A minimal, real vanilla Web Component — the deterministic fixture ADR
 * 0003 calls for, so ForgeGate's own dev/test workflow has something real
 * (not a synthetic in-memory manifest) to point a workspace scan at.
 * Deliberately plain (no build step, no framework) so it can be opened by
 * ForgeGate with zero setup.
 *
 * @fires acme-click - Fired when the button is activated and not disabled.
 * @slot - Button label content.
 * @csspart base - The root <button> element.
 */
export class AcmeButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'disabled'];
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this.#handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#handleClick);
  }

  attributeChangedCallback() {
    this.render();
  }

  /** Visual variant: "primary" or "secondary". */
  get variant() {
    return this.getAttribute('variant') ?? 'primary';
  }

  set variant(value) {
    this.setAttribute('variant', value);
  }

  /** Moves keyboard focus to the rendered button element. */
  focus() {
    this.querySelector('button')?.focus();
  }

  #handleClick = () => {
    if (this.hasAttribute('disabled')) {
      return;
    }
    this.dispatchEvent(new CustomEvent('acme-click', { bubbles: true, composed: true }));
  };

  render() {
    const button = document.createElement('button');
    button.part.add('base');
    button.className = `variant-${this.variant}`;
    button.disabled = this.hasAttribute('disabled');
    button.append(document.createElement('slot'));
    this.replaceChildren(button);
  }
}

customElements.define('acme-button', AcmeButton);
