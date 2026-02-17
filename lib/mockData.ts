
export const MOCK_FLOWS = [
    { id: '1', name: 'Order Processing - V2', type: 'Cloud Flow', status: 'Active', logic: { trigger: 'When a row is added', steps: 12 }, connRefs: 2 },
    { id: '2', name: 'Notify Account Manager', type: 'Cloud Flow', status: 'Active', logic: { trigger: 'Recurrence', steps: 4 }, connRefs: 1 },
    { id: '3', name: 'Sync Legacy Data', type: 'Cloud Flow', status: 'Warning', logic: { trigger: 'Manual', steps: 45 }, connRefs: 4 },
];

export const MOCK_TABLES = [
    { id: 't1', name: 'cr81_Project', logicalName: 'cr81_project', columns: 24, formulas: 3 },
    { id: 't2', name: 'Account', logicalName: 'account', columns: 140, formulas: 5 },
];

export const MOCK_ANALYSIS_RESULT = {
    summary: "Logic Audit Completed. 2 Critical issues found in 'Sync Legacy Data'.",
    findings: [
        { type: 'error', category: 'Logic', title: 'Infinite Loop Potential', description: 'Step "Update Row" might re-trigger this flow if no condition check is added.', suggestion: 'Add a "Trigger Condition" to the start of the flow.' },
        { type: 'warning', category: 'Performance', title: 'OData Filter Missing', description: 'The "List Rows" step fetches all accounts without a filter, impacting performance.', suggestion: 'Apply a $filter query to limit results.' },
        { type: 'info', category: 'Connection', title: 'Reference OK', description: 'All connection references are properly mapped for the Production environment.' }
    ]
};
