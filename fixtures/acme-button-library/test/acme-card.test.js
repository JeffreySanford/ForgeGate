import assert from 'node:assert/strict';
import test from 'node:test';

class ElementStub {
  attributes = new Map();
  children = [];
  part = new Set();
  className = '';

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
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

const { AcmeCard } = await import('../src/acme-card.js');

test('renders the neutral card container by default', () => {
  const component = new AcmeCard();
  component.connectedCallback();

  const section = component.querySelector('section');
  assert.equal(section.className, 'tone-neutral');
  assert.equal(section.part.has('container'), true);
});

test('reflects accent tone into the rendered container', () => {
  const component = new AcmeCard();
  component.setAttribute('tone', 'accent');
  component.connectedCallback();

  assert.equal(component.querySelector('section').className, 'tone-accent');
});
