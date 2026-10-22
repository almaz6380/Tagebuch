import { parseISODate } from './dates';

export const PROMPTS = [
  'Wofür bist du heute dankbar?',
  'Was hat dich heute zum Lächeln gebracht?',
  'Welcher Moment heute soll dir in Erinnerung bleiben?',
  'Was hat dich heute Kraft gekostet, und was hat dir Kraft gegeben?',
  'Worüber hast du heute am meisten nachgedacht?',
  'Was hast du heute Neues gelernt?',
  'Mit wem hast du heute gern Zeit verbracht?',
  'Was würdest du heute anders machen, wenn du könntest?',
  'Welches Gefühl war heute am stärksten, und woher kam es?',
  'Was hast du heute für dich selbst getan?',
  'Worauf freust du dich gerade?',
  'Was ist dir heute gut gelungen?',
  'Welche kleine Sache hat deinen Tag schöner gemacht?',
  'Was beschäftigt dich gerade, ohne dass du es jemandem erzählt hast?',
  'Wie würdest du den heutigen Tag in drei Worten beschreiben?',
  'Was möchtest du morgen auf keinen Fall vergessen?',
  'Wem möchtest du gern einmal Danke sagen, und wofür?',
  'Was hat dich heute überrascht?',
  'Wovon hättest du heute gern mehr gehabt?',
  'Welches Gespräch ist dir heute im Kopf geblieben?',
  'Was gibt dir im Moment Sicherheit?',
  'Wann hast du dich heute ganz bei dir gefühlt?',
  'Welche Sorge darf heute Abend hier auf dem Papier bleiben?',
  'Was hat dich heute inspiriert?',
  'Worauf bist du in letzter Zeit stolz?',
  'Was würdest du deinem jüngeren Ich heute sagen?',
  'Welches Lied, Buch oder Bild passt zu deinem Tag?',
  'Was hast du heute losgelassen?',
  'Wo warst du heute geduldig mit dir oder anderen?',
  'Was war heute schwer, und wie bist du damit umgegangen?',
  'Welche Gewohnheit möchtest du gern pflegen?',
  'Wie hast du heute für deinen Körper gesorgt?',
  'Was möchtest du in dieser Woche noch erleben?',
  'Welcher Ort hat dir heute gutgetan?',
  'Was hat dich heute geärgert, und was steckt wirklich dahinter?',
  'Wofür hattest du heute keine Zeit, obwohl es dir wichtig ist?',
  'Welche Entscheidung steht gerade an?',
  'Was macht dich gerade glücklich, ganz ohne Grund?',
  'Woran merkst du, dass es dir gut geht?',
  'Wenn heute ein Kapitel in deinem Buch wäre: Wie hieße es?',
] as const;

export const TEMPLATES = [
  {
    key: 'gratitude',
    label: 'Dankbarkeit',
    text: 'Drei Dinge, für die ich heute dankbar bin:\n1. \n2. \n3. \n',
  },
  {
    key: 'evening',
    label: 'Abendrückblick',
    text: 'Was war heute schön?\n\n\nWas war schwer?\n\n\nWas nehme ich mit?\n',
  },
] as const;

/** Same prompt for everyone on a given day, so it feels like a "question of the day". */
export function promptIndexFor(date: string) {
  const days = Math.floor(parseISODate(date).getTime() / 86_400_000);
  return ((days % PROMPTS.length) + PROMPTS.length) % PROMPTS.length;
}
