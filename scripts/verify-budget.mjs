import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load env
function loadEnv() {
    try {
        const envContent = readFileSync(".env.local", "utf-8");
        const vars = {};
        envContent.split("\n").forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...valueParts] = trimmed.split("=");
                if (key && valueParts.length > 0) {
                    vars[key.trim()] = valueParts.join("=").trim();
                }
            }
        });
        return vars;
    } catch (e) {
        return {};
    }
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBudget() {
    console.log("Checking for budget 'XYZ Engenharia'...");

    // Try to find by client name in the JSON data or related client
    // First, let's just get the last 5 budgets
    const { data: budgets, error } = await supabase
        .from("orcamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching budgets:", error);
        return;
    }

    console.log("Last 5 budgets:");
    budgets.forEach(b => {
        console.log(`- ID: ${b.id}, Code: ${b.codigo}, Client: ${b.cliente_nome || 'N/A'}, Created: ${b.created_at}`);
    });

    // Check for specific client
    const target = budgets.find(b => b.cliente_nome?.includes("XYZ") || b.cliente_nome?.includes("Engenharia"));
    if (target) {
        console.log("\nFOUND TARGET BUDGET:");
        console.log(JSON.stringify(target, null, 2));
    } else {
        console.log("\nTarget budget NOT found in last 5.");
    }
}

checkBudget();
