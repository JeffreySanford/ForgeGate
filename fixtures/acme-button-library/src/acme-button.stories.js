import { html } from 'lit';
import './acme-button.js';

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
