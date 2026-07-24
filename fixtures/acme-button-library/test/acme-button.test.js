import assert from 'node:assert/strict';
import test from 'node:test';

class ElementStub {
  attributes = new Map();
  children = [];
  listeners = new Map();
  part = new Set();
  className = '';
  disabled = false;

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  dispatchEvent(event) {
    this.listeners.get(event.type)?.(event);
    return true;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  append(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  querySelector(name) {
    return this.children.find((child) => child.localName === name) ?? null;
  }
}

globalThis.HTMLElement = ElementStub;
globalThis.CustomEvent = class {
  constructor(type, options) {
    this.type = type;
    this.options = options;
  }
};
globalThis.document = {
  createElement(name) {
    const element = new ElementStub();
    element.localName = name;
    return element;
  },
};
globalThis.customElements = {
  define() {},
};

const { AcmeButton } = await import('../src/acme-button.js');

test('renders the primary native button contract by default', () => {
  const component = new AcmeButton();
  component.connectedCallback();

  const button = component.querySelector('button');
  assert.equal(button.className, 'variant-primary');
  assert.equal(button.disabled, false);
  assert.equal(button.part.has('base'), true);
});

test('reflects the disabled component state into the native button', () => {
  const component = new AcmeButton();
  component.setAttribute('disabled', '');
  component.connectedCallback();

  assert.equal(component.querySelector('button').disabled, true);
});
