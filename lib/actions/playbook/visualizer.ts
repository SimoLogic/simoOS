"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    }
    if (!supabaseKey || supabaseKey.includes("placeholder")) {
        throw new Error("DB config error: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
    }
    return createClient(supabaseUrl, supabaseKey);
}

export async function getPlaybookNodes(playbookId: string) {
    const supabase = getSupabase();
    const { data: pb, error: pbError } = await supabase
        .from("dim_playbook")
        .select(`
      *,
      fact_playbook_step (
         id,
         step_number,
         day_offset,
         owner_type,
         deliverable_name,
         frequency,
         contra_playbook_owner_id,
         dim_playbook_activity_dictionary ( activity_name )
      )
    `)
        .eq("id", playbookId)
        .single();

    if (pbError || !pb) {
        console.error("Error fetching playbook nodes:", pbError);
        return { success: false, data: null };
    }

    // Transform steps into React Flow Nodes and Edges
    const nodes: any[] = [];
    const edges: any[] = [];

    const steps = pb.fact_playbook_step.sort((a: any, b: any) => a.step_number - b.step_number);

    let yOffset = 50;

    steps.forEach((step: any, index: number) => {
        nodes.push({
            id: step.id,
            type: 'customStepNode', // Custom node type we will create
            position: { x: 250, y: yOffset },
            data: {
                stepNumber: step.step_number,
                activityName: step.dim_playbook_activity_dictionary?.activity_name || 'Undefined Activity',
                deliverableName: step.deliverable_name,
                ownerType: step.owner_type,
                frequency: step.frequency,
                hasContraPlaybook: !!step.contra_playbook_owner_id,
                dayOffset: step.day_offset
            }
        });

        // Connect to next sequential step if exists
        if (index < steps.length - 1) {
            const nextStep = steps[index + 1];
            edges.push({
                id: `e-${step.id}-${nextStep.id}`,
                source: step.id,
                target: nextStep.id,
                animated: true,
                label: `Wait ${nextStep.day_offset} days`,
                style: { stroke: '#002B5B', strokeWidth: 2 }
            });
        }

        yOffset += 200; // Space nodes vertically
    });

    return { success: true, nodes, edges, title: pb.name };
}
