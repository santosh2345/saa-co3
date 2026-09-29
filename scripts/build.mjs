// Builds public/index.html from src/index.template.html + data/questions.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = JSON.parse(readFileSync('data/questions.json', 'utf8')).data.questions;
const qs = src.map(q => ({
  id: q.id,
  question_type: q.question_type,
  selection_limit: q.selection_limit,
  text: q.text || '',
  options: q.options || {},
  correct_answer: q.correct_answer || [],
  explanations: q.explanations || {},
  references: q.references || [],
  category: q.category || '',
  sub_category: q.sub_category || '',
}));
const data = JSON.stringify(qs).replaceAll('</', '<\/');
const html = readFileSync('src/index.template.html', 'utf8').replace('__DATA__', () => data);

mkdirSync('public', { recursive: true });
writeFileSync('public/index.html', html);
console.log(`${qs.length} questions -> public/index.html (${Math.round(html.length / 1024)} KB)`);
