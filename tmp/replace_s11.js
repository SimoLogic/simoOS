const fs = require('fs');

try {
  let types = fs.readFileSync('types/pmo.types.ts', 'utf8');
  types = types.replace(
  /export type PmoFieldType =[\s\S]+?;/,
  `export type PmoFieldType = 
    | 'text'
    | 'status'
    | 'person'
    | 'date'
    | 'date_range'
    | 'number'
    | 'formula'
    | 'checkbox'
    | 'dropdown'
    | 'file'
    | 'mirror'
    | 'link'
    | 'email'
    | 'phone'
    | 'rating'
    | 'progress'
    | 'currency'
    | 'tags'
    | 'auto_number'
    | 'last_updated';`
  );
  fs.writeFileSync('types/pmo.types.ts', types);
  console.log('types updated');

  let factory = fs.readFileSync('components/pmo/grid/ColumnFactory.tsx', 'utf8');
  factory = factory.replace(/case "currency" as string:/g, 'case "currency":')
    .replace(/case "tags" as string:/g, 'case "tags":')
    .replace(/case "auto_number" as string:/g, 'case "auto_number":')
    .replace(/case "last_updated" as string:/g, 'case "last_updated":')
    .replace(
      /import \{ FormulaCell \}       from "\.\/fields\/FormulaCell";/,
      `import { FormulaCell }       from "./fields/FormulaCell";\nimport { MirrorCell }        from "./fields/MirrorCell";`
    ).replace(
      /\/\/ ── MIRROR ────────────────────────────────────────────────────────────────[\s\S]+?case "mirror":[\s\S]+?\/\/ ── DEFAULT ───────────────────────────────────────────────────────────────/,
      `// ── MIRROR ────────────────────────────────────────────────────────────────\n    case "mirror":\n      return <MirrorCell task={task} />;\n\n    // ── DEFAULT ───────────────────────────────────────────────────────────────`
    );
  fs.writeFileSync('components/pmo/grid/ColumnFactory.tsx', factory);
  console.log('factory updated');

  let selector = fs.readFileSync('components/pmo/grid/ColumnTypeSelector.tsx', 'utf8');
  selector = selector.replace(/\{ type: "tags" as PmoFieldType,/g, '{ type: "tags",')
    .replace(/\{ type: "currency" as PmoFieldType,/g, '{ type: "currency",')
    .replace(/\{ type: "last_updated" as PmoFieldType,/g, '{ type: "last_updated",');

  if (!selector.includes('type: "auto_number"')) {
      selector = selector.replace(
      /(\{ type: "last_updated".*?\S+ \},)/,
      `$1\n  { type: "auto_number", label: "Auto Number", description: "Auto-generated sequence", icon: Hash, color: "#676879" },`
      );
  }
  fs.writeFileSync('components/pmo/grid/ColumnTypeSelector.tsx', selector);
  console.log('selector updated');
} catch(e) {
  console.error(e);
}
