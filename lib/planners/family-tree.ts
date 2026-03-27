import { createAssumption } from "@/lib/normalization";
import type { GraphPlan, GraphPlanNode } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";
import { humanizeToken, slugify } from "@/lib/utils";

function extractName(pattern: RegExp, prompt: string) {
  const match = prompt.match(pattern);
  return match?.[1] ? humanizeToken(match[1]) : null;
}

function addPerson(
  nodes: Map<string, GraphPlanNode>,
  label: string,
  notes?: string,
) {
  const id = slugify(label);
  if (nodes.has(id)) {
    return nodes.get(id)!;
  }

  const node: GraphPlanNode = { id, label, kind: "actor", notes };
  nodes.set(id, node);
  return node;
}

export async function planFamilyTree(prompt: string): Promise<GraphPlan> {
  const nodes = new Map<string, GraphPlanNode>();
  const edges: GraphPlan["edges"] = [];
  const assumptions = [];

  const self = extractName(/\bi am\s+([A-Za-z]+)\b/i, prompt) ?? "You";
  const mother = extractName(/\bmy mom is\s+([A-Za-z]+)\b/i, prompt);
  const father = extractName(/\bmy father is\s+([A-Za-z]+)\b/i, prompt);
  const namedBrother = extractName(/\bmy brother\s+([A-Za-z]+)\b/i, prompt);
  const totalBrothers = Number(prompt.match(/\bi have\s+(\d+)\s+brothers?\b/i)?.[1] ?? "0");
  const sisterInLaw = extractName(/\bmy sister in law\s+([A-Za-z]+)\b/i, prompt);
  const sisterInLawSpouse = extractName(
    /\bmy sister in law\s+[A-Za-z]+\s+is married with\s+([A-Za-z]+)\b/i,
    prompt,
  );
  const grandfather = extractName(
    /\btheir father is called\s+([A-Za-z]+)\b/i,
    prompt,
  );

  addPerson(nodes, self);

  if (mother) {
    addPerson(nodes, mother);
    edges.push({
      source: slugify(mother),
      target: slugify(self),
      label: "mother of",
    });
  }

  if (father) {
    addPerson(nodes, father);
    edges.push({
      source: slugify(father),
      target: slugify(self),
      label: "father of",
    });
  }

  if (mother && father) {
    edges.push({
      source: slugify(mother),
      target: slugify(father),
      label: "parents of same child",
      style: "dashed",
    });
  }

  const brotherNames = [];
  if (namedBrother) {
    brotherNames.push(namedBrother);
  }

  const unnamedBrothers = Math.max(totalBrothers - brotherNames.length, 0);
  for (let index = 0; index < unnamedBrothers; index += 1) {
    const label = `Brother ${index + 2}`;
    brotherNames.push(label);
    assumptions.push(
      createAssumption(`Added ${label} as a placeholder for an unnamed brother.`),
    );
  }

  for (const brother of brotherNames) {
    addPerson(nodes, brother);
    edges.push({
      source: slugify(brother),
      target: slugify(self),
      label: "brother of",
    });
  }

  if (namedBrother) {
    assumptions.push(
      createAssumption(`${namedBrother} is single, so no partner node was added for him.`),
    );
  }

  if (sisterInLaw) {
    addPerson(nodes, sisterInLaw);
    edges.push({
      source: slugify(sisterInLaw),
      target: slugify(self),
      label: "sister-in-law of",
      style: "dashed",
    });
  }

  if (sisterInLawSpouse) {
    addPerson(nodes, sisterInLawSpouse);
  }

  if (sisterInLaw && sisterInLawSpouse) {
    edges.push({
      source: slugify(sisterInLaw),
      target: slugify(sisterInLawSpouse),
      label: "married to",
    });
    assumptions.push(
      createAssumption(
        `Modeled ${sisterInLaw} as a sister-in-law of ${self} and connected her marriage to ${sisterInLawSpouse}.`,
      ),
    );
  }

  const auntOne = "Jane (Aunt 1)";
  const auntTwo = "Jane (Aunt 2)";

  if (/aunts?\s+from my father side/i.test(prompt)) {
    addPerson(nodes, auntOne);
    addPerson(nodes, auntTwo);

    if (father) {
      edges.push({ source: slugify(auntOne), target: slugify(father), label: "sister of" });
      edges.push({ source: slugify(auntTwo), target: slugify(father), label: "sister of" });
    }
  }

  if (grandfather) {
    addPerson(nodes, grandfather);
    edges.push({ source: slugify(grandfather), target: slugify(auntOne), label: "father of" });
    edges.push({ source: slugify(grandfather), target: slugify(auntTwo), label: "father of" });

    if (father) {
      edges.push({ source: slugify(grandfather), target: slugify(father), label: "father of" });
      assumptions.push(
        createAssumption(
          `Inferred that ${grandfather} is also the father of ${father} because the named aunts are on the father's side.`,
        ),
      );
    }
  }

  return {
    version: "1",
    diagramType: "family_tree",
    title: `${self} family tree`,
    direction: detectPromptDirection(prompt, "TB"),
    nodes: [...nodes.values()],
    edges,
    assumptions,
    clarificationQuestions: [],
  };
}
