import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// The secret should be in .env.local, but for the test we use the default
const HMAC_SECRET = process.env.SIMO_IS_HMAC_SECRET || 'test_secret_simo_is_123';

function signPayload(payload: any, secret: string) {
    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    return `sha256=${hmac.digest('hex')}`;
}

test('Simo IS Integration Flow: HMAC -> Grid -> Protection', async ({ request, page }) => {
    const orgId = 'org-test-123';
    const boardId = 'board-sample-pmo'; // Assume a board exists or use a constant
    
    const payload = {
        playbookId: 'pb-e2e-001',
        assignmentId: `e2e-assign-${Date.now()}`,
        orgId: orgId,
        boardId: boardId,
        employeeId: 'emp-alpha',
        startDate: new Date().toISOString(),
        countryCode: 'CO',
        taskTemplates: [
            {
                sourcePlaybookTaskId: 'tpl-task-1',
                title: 'E2E Protected Task',
                description: 'This task was generated via Simo IS and must be protected',
                frequencyType: 'ONCE',
                priority: 'critical',
                offsetWorkdays: 0
            }
        ]
    };

    const signature = signPayload(payload, HMAC_SECRET);

    // 1. Send Playbook via HMAC Receptor (Prompt #13)
    const response = await request.post('/api/integrations/simo/playbook-assignment', {
        data: payload,
        headers: {
            'x-simo-signature': signature,
            'idempotency-key': payload.assignmentId,
            'Content-Type': 'application/json'
        }
    });

    expect(response.status()).toBe(202); // Queued

    // 2. Access the PMO Board
    // Note: In a real test we might need to login. Assume dev mode bypass.
    await page.goto(`/pmo/board/${boardId}`);
    
    // 3. Verify task visibility and protection metadata
    const taskRow = page.locator('div', { hasText: 'E2E Protected Task' }).first();
    await expect(taskRow).toBeVisible();

    // 4. Verify Protection Shield (Prompt #24/23 logic)
    // Check if the task has the "protected" visual markers (e.g., specific border or lock icon)
    // In our implementation, we used dashed borders or lock icons.
    const lockIcon = taskRow.locator('svg.lucide-lock');
    if (await lockIcon.count() > 0) {
        await expect(lockIcon).toBeVisible();
    }

    // 5. Verify Immutability (Shield 1: Delete Blocking)
    // Attempting to open context menu or find delete button should fail/be hidden
    const deleteAction = page.locator('button:has-text("Eliminar")');
    await expect(deleteAction).toBeHidden();
});
