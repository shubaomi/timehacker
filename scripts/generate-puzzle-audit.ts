import { writeFile } from "node:fs/promises";
import path from "node:path";
import { CHEAT_DEFINITIONS } from "../src/game/cheats";
import { PUZZLE_SCENES } from "../src/game/puzzle-scenes";

const columns = [
  "#", "slug", "name (EN / 中文)", "D", "scene theme", "composition", "visual clue",
  "discovery", "solve", "clue-answer logic", "armed feedback", "hint 1", "hint 2",
  "mobile", "keyboard", "reduced motion", "expected", "signature", "anti-copy review",
  "creative", "fair", "aha", "identity", "mobile", "a11y", "useful",
];

function safe(value: string | number) {
  return String(value).replaceAll("|", "∣").replaceAll("\n", " ");
}

const rows = PUZZLE_SCENES.map((scene, index) => {
  const cheat = CHEAT_DEFINITIONS.find(({ slug }) => slug === scene.slug);
  if (!cheat) throw new Error(`Missing cheat for ${scene.slug}`);
  const ratings = scene.ratings;
  return [
    index + 1,
    scene.slug,
    `${cheat.name} / ${cheat.nameZh}`,
    scene.difficulty,
    `${scene.motif.en} / ${scene.motif.zh}`,
    scene.composition,
    `${scene.objects.map(({ glyph }) => glyph).join(" ")} in ${scene.targetZone}`,
    `${scene.discoveryRule.mechanic}: ${scene.discoveryRule.gesture}`,
    `${scene.unlockRule.mechanic}: ${scene.unlockRule.gesture}`,
    `${scene.hints.observation.en} ${scene.hints.logic.en}`,
    `${scene.feedback.en} / ${scene.feedback.zh}`,
    `${scene.hints.observation.en} / ${scene.hints.observation.zh}`,
    `${scene.hints.logic.en} / ${scene.hints.logic.zh}`,
    `${scene.mobileAlternative.en} / ${scene.mobileAlternative.zh}`,
    `${scene.keyboardAlternative.en} / ${scene.keyboardAlternative.zh}`,
    `${scene.reducedMotionAlternative.en} / ${scene.reducedMotionAlternative.zh}`,
    `${scene.expectedSeconds}s`,
    scene.signature,
    `${scene.antiCopyReview.en} / ${scene.antiCopyReview.zh}`,
    ...ratings,
  ].map(safe);
});

const averages = PUZZLE_SCENES.map(({ ratings }) => ratings.reduce((sum, value) => sum + value, 0) / ratings.length);
const content = [
  "# Time Hacker puzzle level audit",
  "",
  "This is the reviewable, generated receipt for the 100 hand-authored puzzle-scene contracts. Edit the authored catalog, then regenerate this file; do not hand-edit rows.",
  "",
  `- Scenes: ${PUZZLE_SCENES.length}`,
  `- Unique scene IDs: ${new Set(PUZZLE_SCENES.map(({ sceneId }) => sceneId)).size}`,
  `- Unique signatures: ${new Set(PUZZLE_SCENES.map(({ signature }) => signature)).size}`,
  `- Primary mechanics: ${new Set(PUZZLE_SCENES.map(({ primaryMechanic }) => primaryMechanic)).size}`,
  `- Non-stopwatch discovery zones: ${PUZZLE_SCENES.filter(({ targetZone }) => targetZone !== "stopwatch").length}`,
  `- Lowest level average: ${Math.min(...averages).toFixed(2)} / 5`,
  "",
  `| ${columns.join(" | ")} |`,
  `| ${columns.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
  "",
].join("\n");

await writeFile(path.resolve("docs", "puzzle-level-audit.md"), content, "utf8");
