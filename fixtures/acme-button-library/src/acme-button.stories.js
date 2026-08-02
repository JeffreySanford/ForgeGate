import { html } from 'lit';
import './acme-button.js';
import './acme-card.js';

/** @type {import('@storybook/web-components-vite').Meta} */
export default {
  title: 'Components/AcmeButton',
  component: 'acme-button',
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
};

/** @type {import('@storybook/web-components-vite').StoryObj} */
export const Primary = {
  args: { variant: 'primary', disabled: false },
  render: (args) => html`<acme-button variant=${args.variant} ?disabled=${args.disabled}>Save changes</acme-button>`,
};

/** @type {import('@storybook/web-components-vite').StoryObj} */
export const Secondary = {
  args: { variant: 'secondary', disabled: false },
  render: (args) => html`<acme-button variant=${args.variant} ?disabled=${args.disabled}>Cancel</acme-button>`,
};

/** @type {import('@storybook/web-components-vite').StoryObj} */
export const Disabled = {
  args: { variant: 'primary', disabled: true },
  render: (args) => html`<acme-button variant=${args.variant} ?disabled=${args.disabled}>Save changes</acme-button>`,
};

export const CardNeutral = {
  name: 'Neutral',
  render: () => html`
    <acme-card>
      <span slot="header">Account status</span>
      <p>Design tokens, states, and evidence are connected.</p>
    </acme-card>
  `,
  parameters: {
    component: 'acme-card',
  },
};

export const CardAccent = {
  name: 'Accent',
  render: () => html`
    <acme-card tone="accent">
      <span slot="header">Release attention</span>
      <p>Human approval evidence is still not connected.</p>
    </acme-card>
  `,
  parameters: {
    component: 'acme-card',
  },
};
