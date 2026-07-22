# ForgeGate Component Blueprints

## Purpose

Component blueprints are framework-neutral definitions of what a production-ready component should contain. They are not visual templates alone and they are not generated code alone.

A blueprint defines:

- Purpose and semantic role
- Public contract
- Required states and variants
- Storybook coverage
- Keyboard behavior
- Accessibility expectations
- Token categories
- Automated tests
- Manual review procedures
- Documentation sections
- Consumer-application scenarios
- Known anti-patterns
- Release evidence requirements

Framework adapters translate blueprint requirements into Angular, React, Vue, Svelte, Lit, and other implementations.

## Blueprint structure

```yaml
id: blueprint.button
version: 1.0.0
category: actions
semantics:
  preferredNativeElement: button
requirements:
  states: [default, hover, focus-visible, active, disabled, loading]
  stories: [default, disabled, loading, icon-only]
  tests: [activation, keyboard, accessible-name, disabled, axe, visual]
  manualReviews: [keyboard, screen-reader, forced-colors, zoom]
```

## Initial blueprint set

### Button

Purpose: trigger an immediate action.

Core contract:

- Appearance
- Tone
- Size
- Disabled
- Loading
- Icon placement
- Accessible label
- Button type

Required behavior:

- Enter and Space activation
- Visible focus
- Disabled state prevents activation
- Loading state prevents duplicate activation where policy requires
- Icon-only form requires accessible name
- Native button semantics preferred

Common anti-patterns:

- Clickable `div`
- Disabled state communicated only by color
- Spinner removes accessible name
- Duplicate activation
- Missing form type

### Link

Purpose: navigate to another location or resource.

Requirements:

- Native anchor semantics
- Valid destination
- Current-page state where applicable
- External-link behavior documented
- Clear distinction from button behavior

### Text input

Requirements:

- Visible label
- Programmatic label
- Description
- Required and optional state
- Error state
- Disabled and readonly distinction
- Autocomplete metadata where applicable
- Accessible validation messaging

### Textarea

Adds:

- Resize behavior
- Character count
- Long content
- Error and limit announcements

### Checkbox

Requirements:

- Checked, unchecked, indeterminate
- Label activation
- Space activation
- Grouping and description
- Disabled behavior

### Radio group

Requirements:

- Group label
- Selected value
- Arrow-key navigation
- Tab behavior
- Required and error states

### Toggle or switch

Requirements:

- Clear on/off state
- Immediate versus submitted effect documented
- Space activation
- Label remains stable when state changes

### Select

The blueprint must distinguish native select from custom listbox or combobox behavior. Native controls should be preferred when they satisfy product needs.

### Combobox and autocomplete

High-complexity requirements:

- Input and popup relationship
- Expanded state
- Active descendant or managed focus
- Arrow keys
- Escape
- Enter selection
- Typed filtering
- No-results state
- Loading state
- Validation
- Screen-reader review across supported combinations

### Alert and status message

Requirements:

- Appropriate live-region behavior
- No unnecessary interruption
- Persistent versus transient behavior
- Actionable error guidance
- Visual and nonvisual severity communication

### Toast

Requirements:

- Announcement timing
- Duration
- Pause or persistence policy
- Action accessibility
- Focus behavior
- Multiple-toast behavior

### Dialog

High-complexity requirements:

- Accessible name and optional description
- Initial focus
- Focus containment
- Escape close behavior
- Close control
- Focus restoration
- Background inertness
- Scroll behavior
- Nested-dialog policy
- Mobile layout

### Tooltip

Requirements:

- Trigger relationship
- Hover and focus availability
- Escape dismissal
- Noninteractive content unless a different pattern is used
- Timing
- Clipping and viewport boundaries

### Menu and menu button

Requirements:

- Trigger state
- Popup relationship
- Arrow-key model
- Home and End where applicable
- Escape
- Typeahead where applicable
- Focus return
- Disabled items

### Tabs

Requirements:

- Tablist, tab, and tabpanel relationships
- Arrow-key navigation
- Automatic versus manual activation policy
- Home and End
- Selected state
- Focus behavior
- Responsive behavior

### Accordion and disclosure

Requirements:

- Button trigger
- Expanded state
- Panel relationship
- Heading hierarchy guidance
- Multiple-open policy

### Breadcrumb

Requirements:

- Navigation label
- Ordered sequence
- Current page
- Separator hidden from assistive technology where appropriate

### Pagination

Requirements:

- Navigation label
- Current page
- Previous and next state
- Large page-count strategy
- Focus and announcement after page change

### Stepper

Requirements:

- Current step
- Completed and unavailable state
- Validation before progression
- Navigation semantics
- Mobile behavior

### Table

Requirements:

- Caption or accessible name
- Header relationships
- Sorting behavior
- Responsive strategy
- Empty state
- Loading state
- Row actions

### Data grid

A grid is not merely a styled table. The blueprint must define:

- Cell and row focus model
- Arrow-key behavior
- Editing model
- Selection model
- Sorting and filtering
- Virtualization behavior
- Screen-reader support targets
- Simpler table fallback where appropriate

### Tree and tree grid

Requirements:

- Hierarchy
- Expanded state
- Level
- Set size and position where needed
- Arrow-key model
- Selection and activation distinction
- Virtualization considerations

### Date and time pickers

Requirements:

- Typed input fallback
- Format guidance
- Calendar keyboard behavior
- Month and year navigation
- Disabled dates
- Validation
- Localization
- Time zone behavior

### File upload

Requirements:

- File selection
- Drag and drop as enhancement, not sole method
- Type and size validation
- Progress
- Error recovery
- Removal
- Multiple files

### Search

Requirements:

- Search landmark or role where appropriate
- Label
- Submit behavior
- Clear behavior
- Suggestions pattern when present
- Results announcement

### Navigation and application shell

Requirements:

- Landmarks
- Skip links
- Heading structure
- Responsive navigation
- Focus management on route changes
- Menu behavior
- Current location

## Blueprint versioning

Blueprint changes may add requirements to existing components. ForgeGate should:

- Record the blueprint version applied to each component.
- Show newly applicable requirements.
- Avoid silently marking existing components failed without explanation.
- Provide migration guidance.
- Permit temporary exceptions.

## Organization overrides

Organizations may extend a blueprint with:

- Brand variants
- Additional test environments
- Supported assistive-technology matrix
- Documentation sections
- Security checks
- Consumer applications
- Approver roles

Overrides should preserve the base blueprint ID and version.

## Blueprint quality bar

A production blueprint is complete only when it includes:

- Semantic rationale
- Portable contract
- State model
- Story matrix
- Automated test matrix
- Manual procedure references
- Documentation template
- Framework adapter fixture coverage
- Known limitations
- Version and migration policy
