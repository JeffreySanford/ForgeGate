import { createComponentManifest } from '@forgegate/core-manifest';
import type {
  Exception,
  Finding,
  ManualProcedure,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import {
  componentDisplayName,
  extractProtectedOverview,
  generateDesignerStarlightComponentPage,
  generateStarlightComponentReportData,
  generateStarlightComponentPage,
  generateStarlightRegistryIndexPage,
  generateStarlightRegistryReportData,
  parseStarlightAudienceOverrideConfig,
  starlightComponentReportDataPath,
  starlightComponentPagePath,
  starlightTemplateForManifest,
  starlightRegistryIndexPath,
  starlightRegistryReportDataPath,
} from './starlight-page';
import { validateGeneratedStarlightMdx } from './starlight-page-validation';

describe('componentDisplayName', () => {
  it('title-cases the last dotted, hyphenated segment of a manifest id', () => {
    expect(componentDisplayName('acme.design-system.acme-button')).toBe(
      'Acme Button',
    );
  });
});

describe('extractProtectedOverview', () => {
  it('returns null when there is no existing page', () => {
    expect(extractProtectedOverview(null)).toBeNull();
  });

  it('returns null when the page has no protected markers', () => {
    expect(extractProtectedOverview('# Just some text')).toBeNull();
  });

  it('extracts the real text a human wrote between the protected markers', () => {
    const page = [
      '## Overview',
      '',
      '{/* forgegate:user-content:start overview */}',
      'A real, human-authored purpose.',
      '{/* forgegate:user-content:end overview */}',
      '',
      '## States',
    ].join('\n');

    expect(extractProtectedOverview(page)).toBe(
      'A real, human-authored purpose.',
    );
  });

  it('extracts legacy HTML-comment protected overview markers', () => {
    const page = [
      '## Overview',
      '',
      '<!-- forgegate:user-content:start overview -->',
      'A prior generated page purpose.',
      '<!-- forgegate:user-content:end overview -->',
    ].join('\n');

    expect(extractProtectedOverview(page)).toBe(
      'A prior generated page purpose.',
    );
  });
});

describe('generateDesignerStarlightComponentPage', () => {
  const manifest = createComponentManifest({
    id: 'acme.design-system.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    componentVersion: '1.2.0',
    lifecycle: 'candidate',
    states: [
      { name: 'default', required: true },
      { name: 'disabled', required: true },
    ],
    tokenMappings: [
      { tokenPath: 'color.action', category: 'color', required: true },
    ],
    storyMappings: [
      { storybookStoryId: 'components-button--default', stateName: 'default' },
    ],
    contract: {
      inputs: [
        {
          name: 'appearance',
          type: 'string',
          required: true,
          description: 'Visual style.',
        },
      ],
      outputs: [{ name: 'activate', description: 'Fires when pressed.' }],
    },
    manualReviewProcedureIds: ['keyboard-and-screen-reader-review'],
  });

  const procedure: ManualProcedure = {
    id: 'keyboard-and-screen-reader-review',
    version: '1.0.0',
    appliesTo: ['button'],
    steps: [
      {
        action: 'Move focus using Tab.',
        expected: 'The accessible name and button role are announced.',
      },
    ],
  };

  it('generates the designer-heavy frontmatter block with real manifest data', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [procedure],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain('title: "Acme Button"');
    expect(page).toContain(
      'description: "Designer-ready ForgeGate report for Acme Button."',
    );
    expect(page).toContain('componentId: "acme.design-system.acme-button"');
    expect(page).toContain(
      'manifestPath: ".forgegate/components/acme.design-system.acme-button.yaml"',
    );
    expect(page).toContain('manifestSchemaVersion: "0.2.0"');
    expect(page).toContain('version: "1.2.0"');
    expect(page).toContain('lifecycle: "candidate"');
    expect(page).toContain('evidenceCommit: "b91d20e"');
    expect(page).toContain('audience: "designer-heavy"');
  });

  it('imports a manifest-backed report data file and passes it into presentation components', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [procedure],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain(
      'import forgegateReport from "../../../data/forgegate/components/acme-button--for-designers.json";',
    );
    expect(page).toContain('report={forgegateReport}');
  });

  it('writes scoped automated, manual review, and finding evidence to the report data artifact', () => {
    const automated: TestExecution = {
      id: 'axe-acme-button',
      componentVersionId: 'acme.design-system.acme-button@1.2.0',
      gate: 'accessibility',
      tool: 'axe',
      toolVersion: '4.9.0',
      adapterVersion: '0.1.0',
      status: 'passed',
      startedAt: '2026-07-31T12:00:00.000Z',
      commitOrFingerprint: 'b91d20e',
      rawArtifactRef: '.forgegate/evidence/axe-acme-button.json',
    };
    const manualReview: ManualReview = {
      id: 'review-acme-button',
      componentVersionId: 'acme.design-system.acme-button@1.2.0',
      procedureId: 'keyboard-and-screen-reader-review',
      procedureVersion: '1.0.0',
      reviewerIdentity: 'designer@example.test',
      reviewerRole: 'Design systems reviewer',
      date: '2026-07-31',
      operatingSystem: 'Windows 11',
      browser: 'Edge',
      assistiveTechnology: 'Narrator',
      status: 'passed',
      commitOrFingerprint: 'b91d20e',
    };
    const finding: Finding = {
      id: 'acme-button-focus-visible',
      componentId: 'acme.design-system.acme-button',
      description: 'Focus-visible treatment needs stronger contrast.',
      severity: 'moderate',
      status: 'open',
    };
    const exception: Exception = {
      id: 'focus-visible-risk-acceptance',
      findingId: 'acme-button-focus-visible',
      approvedBy: 'lead-reviewer@example.test',
      approvedAt: '2026-07-31T12:30:00.000Z',
      rationale: 'Accepted until the next token contrast update.',
      expiresAt: '2026-09-01T00:00:00.000Z',
    };
    const data = generateStarlightComponentReportData({
      manifest,
      procedures: [procedure],
      testExecutions: [
        automated,
        { ...automated, id: 'axe-other', componentVersionId: 'other@1.0.0' },
      ],
      manualReviews: [
        manualReview,
        {
          ...manualReview,
          id: 'review-other',
          componentVersionId: 'other@1.0.0',
        },
      ],
      findings: [
        finding,
        { ...finding, id: 'other-finding', componentId: 'other' },
      ],
      exceptions: [
        exception,
        {
          ...exception,
          id: 'other-exception',
          findingId: 'other-finding',
        },
      ],
      evidenceCommit: 'b91d20e',
      template: 'designer',
    });

    expect(data).toContain('"automated": [');
    expect(data).toContain('"id": "axe-acme-button"');
    expect(data).toContain('"manualReviews": [');
    expect(data).toContain('"reviewerRole": "Design systems reviewer"');
    expect(data).toContain('"findings": [');
    expect(data).toContain('Focus-visible treatment needs stronger contrast.');
    expect(data).toContain('"exceptions": [');
    expect(data).toContain('"id": "focus-visible-risk-acceptance"');
    expect(data).toContain('Accepted until the next token contrast update.');
    expect(data).not.toContain('"id": "axe-other"');
    expect(data).not.toContain('"id": "review-other"');
    expect(data).not.toContain('"id": "other-finding"');
    expect(data).not.toContain('"id": "other-exception"');
  });

  it('generates the same scoped report as a companion JSON data artifact', () => {
    const data = generateStarlightComponentReportData({
      manifest,
      procedures: [procedure],
      testExecutions: [
        {
          id: 'axe-acme-button',
          componentVersionId: 'acme.design-system.acme-button@1.2.0',
          gate: 'accessibility',
          tool: 'axe',
          toolVersion: '4.9.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-07-31T12:00:00.000Z',
          commitOrFingerprint: 'b91d20e',
        },
      ],
      manualReviews: [],
      findings: [],
      evidenceCommit: 'b91d20e',
      template: 'designer',
    });

    expect(JSON.parse(data)).toMatchObject({
      componentId: 'acme.design-system.acme-button',
      tier: 'designer-heavy',
      manifest: {
        schemaVersion: '0.2.0',
        path: '.forgegate/components/acme.design-system.acme-button.yaml',
        framework: 'web-components',
        adapter: 'framework.web-components',
      },
      evidence: {
        automated: [{ id: 'axe-acme-button', status: 'passed' }],
        releaseDecision: {
          status: 'not-connected',
          reason:
            'No policy id and version are authored for this component, so ForgeGate cannot summarize release readiness.',
          blockingFindingIds: [],
          evidenceIds: ['axe-acme-button'],
        },
        notConnected: expect.arrayContaining([
          {
            section: 'manual reviews',
            reason:
              'No manual review evidence is connected for this component version yet.',
          },
          {
            section: 'policy snapshot',
            reason:
              'No policy id and version are authored for this component, so no policy snapshot can be summarized.',
          },
        ]),
      },
      documentation: [],
    });
  });

  it('adds a blocked release summary and documentation status when real inputs exist', () => {
    const data = JSON.parse(
      generateStarlightComponentReportData({
        manifest: createComponentManifest({
          id: 'acme.design-system.acme-button',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: '.',
          componentVersion: '1.2.0',
          policyId: 'acme.baseline',
          policyVersion: '1.0.0',
          documentationTargets: [
            {
              adapter: 'starlight',
              pathOrPageId: 'src/content/docs/components/button.mdx',
              publishedVersion: '1.1.0',
            },
          ],
        }),
        procedures: [],
        testExecutions: [],
        manualReviews: [],
        findings: [
          {
            id: 'button-finding',
            componentId: 'acme.design-system.acme-button',
            description: 'A real blocking finding.',
            severity: 'serious',
            status: 'open',
          },
        ],
        evidenceCommit: 'b91d20e',
        template: 'designer',
      }),
    );

    expect(data.evidence.releaseDecision).toMatchObject({
      status: 'blocked',
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
      blockingFindingIds: ['button-finding'],
      commit: 'b91d20e',
    });
    expect(data.evidence.policySnapshot).toEqual({
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
      source: 'component-manifest',
      manifestPath:
        '.forgegate/components/acme.design-system.acme-button.yaml',
      status: 'authored-reference',
      detail:
        'This report includes the component manifest policy reference. ForgeGate has not loaded a full policy ruleset snapshot yet.',
    });
    expect(data.evidence.notConnected).toContainEqual({
      section: 'policy ruleset snapshot',
      reason:
        'Only the manifest-authored policy id and version are connected; the full evaluated policy ruleset is not loaded into Starlight report data yet.',
    });
    expect(data.evidence.notConnected).toContainEqual({
      section: 'exceptions',
      reason:
        'No exception evidence approves any connected finding for this component yet.',
    });
    expect(data.documentation).toEqual([
      {
        adapter: 'starlight',
        pathOrPageId: 'src/content/docs/components/button.mdx',
        status: 'drifted',
        detail:
          'Published version 1.1.0 does not match component version 1.2.0.',
      },
    ]);
  });

  it('keeps the underlying report facts identical across audience tiers', () => {
    const designerData = JSON.parse(
      generateStarlightComponentReportData({
        manifest,
        procedures: [procedure],
        testExecutions: [],
        manualReviews: [],
        findings: [],
        evidenceCommit: 'b91d20e',
        template: 'designer',
      }),
    );
    const balancedData = JSON.parse(
      generateStarlightComponentReportData({
        manifest,
        procedures: [procedure],
        testExecutions: [],
        manualReviews: [],
        findings: [],
        evidenceCommit: 'b91d20e',
        template: 'balanced',
      }),
    );
    const developerData = JSON.parse(
      generateStarlightComponentReportData({
        manifest,
        procedures: [procedure],
        testExecutions: [],
        manualReviews: [],
        findings: [],
        evidenceCommit: 'b91d20e',
        template: 'developer',
      }),
    );

    const withoutTier = (report: Record<string, unknown>) => {
      const copy = { ...report };
      delete copy['tier'];
      return copy;
    };
    expect(withoutTier(designerData)).toEqual(withoutTier(balancedData));
    expect(withoutTier(designerData)).toEqual(withoutTier(developerData));
    expect([designerData.tier, balancedData.tier, developerData.tier]).toEqual([
      'designer-heavy',
      'balanced',
      'developer-heavy',
    ]);
  });

  it('leads with StateMatrix and TokenTable, and includes one Storybook link per connected state', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [procedure],
      evidenceCommit: 'b91d20e',
    });

    const stateMatrixIndex = page.indexOf('<StateMatrix');
    const tokenTableIndex = page.indexOf('<TokenTable');
    const capabilitiesIndex = page.indexOf('## Capabilities');
    expect(stateMatrixIndex).toBeGreaterThan(-1);
    expect(tokenTableIndex).toBeGreaterThan(stateMatrixIndex);
    expect(capabilitiesIndex).toBeGreaterThan(stateMatrixIndex);
    expect(page).toContain(
      '<StoryPreview storyId="components-button--default" />',
    );
    expect(page).toContain('No story is connected for this state yet.');
  });

  it('summarizes the API as plain language rather than code', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [procedure],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain('**appearance** (required): Visual style.');
    expect(page).toContain('**activate**: Fires when pressed.');
    expect(page).not.toContain('```');
  });

  it('states accessibility requirements as behavior descriptions from the connected procedure', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [procedure],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain(
      '- **Move focus using Tab.** The accessible name and button role are announced.',
    );
  });

  it('discloses honestly when no procedure is connected', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain(
      'No manual accessibility review procedure is connected yet.',
    );
  });

  it('defaults the protected overview section and preserves a real prior one when given', () => {
    const withoutExisting = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [],
      evidenceCommit: 'b91d20e',
    });
    expect(withoutExisting).toContain(
      'Add a one-line purpose and any content guidance for this component.',
    );

    const withExisting = generateDesignerStarlightComponentPage({
      manifest,
      procedures: [],
      evidenceCommit: 'b91d20e',
      existingOverview: 'A real, human-authored purpose.',
    });
    expect(withExisting).toContain('A real, human-authored purpose.');
    expect(withExisting).not.toContain(
      'Add a one-line purpose and any content guidance for this component.',
    );
  });
});

describe('generateStarlightComponentPage', () => {
  const manifest = createComponentManifest({
    id: 'acme.design-system.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '@acme/button',
    componentVersion: '1.2.0',
    lifecycle: 'candidate',
    states: [{ name: 'default', required: true }],
    storyMappings: [
      { storybookStoryId: 'components-button--default', stateName: 'default' },
    ],
    contract: {
      inputs: [
        {
          name: 'label',
          type: 'string',
          required: true,
          description: 'Visible text for the action.',
        },
      ],
    },
  });

  it('generates the balanced page shape', () => {
    const page = generateStarlightComponentPage({
      manifest,
      procedures: [],
      evidenceCommit: 'b91d20e',
      template: 'balanced',
    });

    expect(page).toContain('audience: "balanced"');
    expect(page.indexOf('## Examples')).toBeLessThan(page.indexOf('## API'));
    expect(page).toContain(
      '<ApiTable component="acme.design-system.acme-button"',
    );
    expect(validateGeneratedStarlightMdx(page).valid).toBe(true);
  });

  it('generates the developer-heavy page shape with code examples', () => {
    const page = generateStarlightComponentPage({
      manifest,
      procedures: [],
      evidenceCommit: 'b91d20e',
      template: 'developer',
    });

    expect(page).toContain('audience: "developer-heavy"');
    expect(page).toContain('## Installation');
    expect(page).toContain("import '@acme/button';");
    expect(page).toContain('```html');
    expect(page).toContain(
      '<ConsumerValidation component="acme.design-system.acme-button" />',
    );
    expect(validateGeneratedStarlightMdx(page).valid).toBe(true);
  });

  it('escapes untrusted manifest text before writing frontmatter and MDX', () => {
    const page = generateStarlightComponentPage({
      manifest: createComponentManifest({
        id: 'acme.design-system.bad-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        states: [{ name: 'bad <state>{x}', required: true }],
        storyMappings: [
          {
            stateName: 'bad <state>{x}',
            storybookStoryId: 'story" /><script>bad</script>',
          },
        ],
        contract: {
          inputs: [
            {
              name: 'danger',
              description: 'Do <not> render {raw}.',
            },
          ],
        },
      }),
      procedures: [],
      evidenceCommit: 'abc: 123',
      template: 'designer',
    });

    expect(page).toContain('evidenceCommit: "abc: 123"');
    expect(page).toContain('bad &lt;state&gt;&#123;x&#125;');
    expect(page).toContain('story&quot; /&gt;&lt;script&gt;bad&lt;/script&gt;');
    expect(page).toContain('Do &lt;not&gt; render &#123;raw&#125;.');
    expect(validateGeneratedStarlightMdx(page).valid).toBe(true);
  });
});

describe('Starlight audience override config', () => {
  const manifest = createComponentManifest({
    id: 'acme.design-system.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: 'packages/button',
  });

  it('uses component, library, organization, package, then default audience overrides', () => {
    const config = parseStarlightAudienceOverrideConfig({
      starlight: {
        defaultAudience: 'balanced',
        organizationAudiences: {
          acme: 'developer-heavy',
        },
        libraryAudiences: {
          'acme.design-system': 'balanced',
        },
        packageAudiences: {
          'packages/button': 'developer-heavy',
        },
        componentAudiences: {
          'acme.design-system.acme-button': 'designer-heavy',
        },
      },
    });

    expect(starlightTemplateForManifest(manifest, config)).toBe('designer');
    expect(
      starlightTemplateForManifest(
        createComponentManifest({
          id: 'acme.design-system.acme-card',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: 'packages/button',
        }),
        config,
      ),
    ).toBe('balanced');
    expect(
      starlightTemplateForManifest(
        createComponentManifest({
          id: 'acme.other-library.acme-dialog',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: 'packages/dialog',
        }),
        config,
      ),
    ).toBe('developer');
    expect(
      starlightTemplateForManifest(
        createComponentManifest({
          id: 'other.ui.acme-dialog',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: 'packages/button',
        }),
        config,
      ),
    ).toBe('developer');
    expect(
      starlightTemplateForManifest(
        createComponentManifest({
          id: 'other.design-system.acme-dialog',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: 'packages/dialog',
        }),
        config,
      ),
    ).toBe('balanced');
  });

  it('ignores invalid audience values rather than inventing a template', () => {
    const config = parseStarlightAudienceOverrideConfig({
      starlight: {
        defaultAudience: 'marketing',
        packageAudiences: { 'packages/button': 'technical' },
        componentAudiences: { 'acme.design-system.acme-button': 'raw' },
      },
    });

    expect(starlightTemplateForManifest(manifest, config)).toBe('designer');
  });
});

describe('generateStarlightRegistryIndexPage', () => {
  it('generates a component registry index from manifests', () => {
    const page = generateStarlightRegistryIndexPage({
      manifests: [
        createComponentManifest({
          id: 'acme.design-system.acme-button',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: '.',
        }),
      ],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain('title: "Component registry"');
    expect(page).toContain('componentCount: 1');
    expect(page).toContain(
      'import forgegateRegistry from "../../../data/forgegate/components/index.json";',
    );
    expect(page).toContain(
      'import acmeButtonReport from "../../../data/forgegate/components/acme-button--for-designers.json";',
    );
    expect(page).toContain('<ComponentRegistry report={forgegateRegistry} />');
    expect(page).toContain('### Acme Button');
    expect(page).toContain(
      '<ComponentStatus component="acme.design-system.acme-button" tier="designer-heavy" report={acmeButtonReport} />',
    );
    expect(page).toContain(
      '<EvidenceSummary component="acme.design-system.acme-button" tier="designer-heavy" report={acmeButtonReport} />',
    );
    expect(validateGeneratedStarlightMdx(page).valid).toBe(true);
  });

  it('keeps generated registry report imports valid for numeric component slugs', () => {
    const page = generateStarlightRegistryIndexPage({
      manifests: [
        createComponentManifest({
          id: 'acme.design-system.2fa-button',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: '.',
        }),
      ],
      evidenceCommit: 'b91d20e',
    });

    expect(page).toContain(
      'import component2faButtonReport from "../../../data/forgegate/components/2fa-button--for-designers.json";',
    );
    expect(page).toContain('report={component2faButtonReport}');
    expect(validateGeneratedStarlightMdx(page).valid).toBe(true);
  });

  it('generates registry companion JSON data from manifests', () => {
    const data = generateStarlightRegistryReportData({
      manifests: [
        createComponentManifest({
          id: 'acme.design-system.acme-button',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: '.',
          componentVersion: '1.2.0',
          lifecycle: 'candidate',
        }),
      ],
      evidenceCommit: 'b91d20e',
    });

    expect(JSON.parse(data)).toEqual({
      evidenceCommit: 'b91d20e',
      componentCount: 1,
      components: [
        {
          componentId: 'acme.design-system.acme-button',
          version: '1.2.0',
          lifecycle: 'candidate',
          manifestPath:
            '.forgegate/components/acme.design-system.acme-button.yaml',
          manifestSchemaVersion: '0.2.0',
        },
      ],
    });
  });
});

describe('validateGeneratedStarlightMdx', () => {
  it('accepts the designer-heavy page shape', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest: createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
      }),
      procedures: [],
      evidenceCommit: 'b91d20e',
    });

    expect(validateGeneratedStarlightMdx(page)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('rejects unknown ForgeGate Starlight imports', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest: createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
      }),
      procedures: [],
      evidenceCommit: 'b91d20e',
    }).replace('StoryPreview,', 'StoryPreview, UnknownWidget,');

    expect(validateGeneratedStarlightMdx(page).issues).toContainEqual({
      code: 'unknown-forgegate-component',
      message:
        'Generated page imports unknown ForgeGate Starlight component UnknownWidget.',
    });
  });

  it('rejects component pages without a protected overview section', () => {
    const page = generateDesignerStarlightComponentPage({
      manifest: createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
      }),
      procedures: [],
      evidenceCommit: 'b91d20e',
    }).replace('{/* forgegate:user-content:start overview */}', '');

    expect(validateGeneratedStarlightMdx(page).issues).toContainEqual({
      code: 'missing-protected-overview',
      message:
        'Generated component page must preserve the protected overview section.',
    });
  });
});

describe('starlightComponentPagePath', () => {
  it('places a page under a workspace-root Starlight project', () => {
    expect(
      starlightComponentPagePath('', 'acme.design-system.acme-button'),
    ).toBe('src/content/docs/components/acme-button.mdx');
  });

  it('places a page under a nested Starlight project', () => {
    expect(
      starlightComponentPagePath(
        'apps/starlight',
        'acme.design-system.acme-button',
      ),
    ).toBe('apps/starlight/src/content/docs/components/acme-button.mdx');
  });

  it('uses companion paths for designer and developer templates', () => {
    expect(
      starlightComponentPagePath(
        'apps/starlight',
        'acme.design-system.acme-button',
        'designer',
      ),
    ).toBe(
      'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
    );
    expect(
      starlightComponentPagePath(
        'apps/starlight',
        'acme.design-system.acme-button',
        'developer',
      ),
    ).toBe(
      'apps/starlight/src/content/docs/components/acme-button--for-developers.mdx',
    );
  });
});

describe('starlightComponentReportDataPath', () => {
  it('places companion report data under the detected Starlight project data directory', () => {
    expect(
      starlightComponentReportDataPath(
        'apps/starlight',
        'acme.design-system.acme-button',
        'designer',
      ),
    ).toBe(
      'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
    );
  });
});

describe('starlightRegistryIndexPath', () => {
  it('places the registry index under components/index.mdx', () => {
    expect(starlightRegistryIndexPath('apps/starlight')).toBe(
      'apps/starlight/src/content/docs/components/index.mdx',
    );
  });
});

describe('starlightRegistryReportDataPath', () => {
  it('places the registry report data under components/index.json', () => {
    expect(starlightRegistryReportDataPath('apps/starlight')).toBe(
      'apps/starlight/src/data/forgegate/components/index.json',
    );
  });
});
