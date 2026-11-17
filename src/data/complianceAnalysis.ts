export type TestCase = {
  id: string
  title: string
  description: string
  status: 'PASS' | 'NEEDS REVIEW'
  observation: string
  validation: string
}

export type ComplianceRisk = {
  id: string
  category: string
  title: string
  description: string
  severity: 'amber' | 'red' | 'purple'
  whyItMatters: string
  recommendation: string
  owner: string
}

export const policyComparison = {
  oldRule: {
    label: 'OLD RULE (Existing Handbook)',
    badge: 'Coverage Gap',
    title: 'Standard Personal Credit Policy (Handbook Ch. 4)',
    description:
      'Existing rule relies on baseline credit appraisal and does NOT contain mandatory control checkpoints for illustrative circular compliance.',
  },
  newRule: {
    label: 'NEW RULE ADDED (From Circular)',
    badge: 'OBL-001',
    title: 'Illustrative Control Framework Implementation',
    description:
      'Apply the illustrative control framework to all described personal-loan and consumer-credit applications prior to sanction. Requires human confirmation of illustrative language.',
  },
}

export const testCases: TestCase[] = [
  {
    id: 'TC-001',
    title: 'Personal Loan Scope Verification',
    description: 'Verified whether the circular applies to retail personal loan products.',
    status: 'PASS',
    observation: 'The sample rule identifies retail personal-loan products as in scope.',
    validation: 'Demonstration check only; confirm applicability against the authoritative circular.',
  },
  {
    id: 'TC-002',
    title: 'Control Framework Boundary Test',
    description: 'Tested if illustrative controls can be enforced in sandbox evaluation.',
    status: 'PASS',
    observation: 'The sample sandbox accepts the control framework as a pre-sanction checkpoint.',
    validation: 'No production system or bank data was accessed for this demonstration.',
  },
  {
    id: 'TC-003',
    title: 'Handbook Policy Provision Cross-Mapping',
    description: 'Cross-checked bank handbook against new circular requirements.',
    status: 'NEEDS REVIEW',
    observation: 'The available handbook excerpt does not establish full coverage of the new controls.',
    validation: 'A compliance reviewer should validate the source text and policy mapping.',
  },
  {
    id: 'TC-004',
    title: 'Audit Trail & Validation Report Compilation',
    description: 'Compiled end-to-end report JSON and markdown audit outputs.',
    status: 'PASS',
    observation: 'Sample analysis metadata and review notes are represented in this report.',
    validation: 'Generated output is illustrative and has not been independently audited.',
  },
]

export const complianceRisks: ComplianceRisk[] = [
  {
    id: 'RISK-001',
    category: 'AMBIGUITY ISSUE',
    title: 'Illustrative Source Language Requires Legal Confirmation',
    description:
      'The circular text uses illustrative phrasing for demo applications. A compliance officer must confirm the exact phrasing.',
    severity: 'amber',
    whyItMatters: 'Treating illustrative wording as a binding requirement could lead to an inaccurate policy change.',
    recommendation: 'Compare the requirement with the official circular and document the legal interpretation before adoption.',
    owner: 'Compliance Officer / Legal Team',
  },
  {
    id: 'RISK-002',
    category: 'POLICY GAP ISSUE',
    title: 'Handbook Coverage Incomplete for New Controls',
    description:
      'The retrieved passages are insufficient to prove full coverage of the new illustrative control framework.',
    severity: 'red',
    whyItMatters: 'An incomplete policy mapping can leave material controls undefined or inconsistently applied.',
    recommendation: 'Review the complete handbook and map each confirmed obligation to an accountable control owner.',
    owner: 'Policy Owner / Compliance Officer',
  },
  {
    id: 'RISK-003',
    category: 'OPERATIONAL RISK',
    title: 'Human Review Mandatory Before Production Deployment',
    description:
      'This report does NOT determine final legal compliance without human sign-off.',
    severity: 'purple',
    whyItMatters: 'The sample analysis has not been validated against authoritative source material or production controls.',
    recommendation: 'Obtain documented approval from authorized compliance and legal reviewers before deployment.',
    owner: 'Authorized Compliance Approver',
  },
]
