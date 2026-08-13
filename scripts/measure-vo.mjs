#!/usr/bin/env node
/**
 * Mesure la durée RÉELLE de chaque narration, avant toute capture.
 *
 * Pourquoi : le pipeline force chaque clip de voix à la durée de sa section
 * (`apad,atrim` dans audio-tour.ts). Trop court, il reste un blanc ; trop
 * long, la phrase est COUPÉE net. On ne le découvrait qu'après une capture et
 * un rendu complets — soit vingt minutes pour apprendre qu'il manque deux
 * secondes de texte.
 *
 * Ce script synthétise les mêmes textes, avec la même voix et le même débit,
 * et compare à la durée vidéo prévue. Il ne rend rien : il dit quoi corriger.
 *
 * Usage :  node scripts/measure-vo.mjs tours/mon-tour.json [...]
 *
 * Lecture : « blanc 0.3s » est une respiration acceptable entre deux sections.
 * « COUPÉE » veut dire qu'il faut allonger les dwellMs de la section — jamais
 * raccourcir un plan, sous peine de rendre l'action illisible à l'écran.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import textToSpeech from '@google-cloud/text-to-speech';

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error('usage: node scripts/measure-vo.mjs tours/<tour>.json [...]');
  process.exit(1);
}

const client = new textToSpeech.TextToSpeechClient({
  keyFilename:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    `${process.env.HOME}/.webgen-motion/genmotion-tts-sa.json`,
});

let coupures = 0;

for (const fichier of fichiers) {
  const tour = JSON.parse(readFileSync(fichier, 'utf8'));
  const voix = tour.voiceGoogleVoice || 'fr-FR-Neural2-D';
  const debit = tour.voiceGoogleRate ?? 1.0;
  console.log(`\n=== ${fichier}  (${voix}, débit ${debit})`);

  const sections = [];
  let courante = null;
  for (const [i, step] of tour.steps.entries()) {
    if (step.type === 'section') {
      courante = { index: i, titre: step.title || '', texte: step.voiceover || '', dwell: 0 };
      sections.push(courante);
    }
    if (courante) courante.dwell += step.dwellMs || 0;
  }

  let parlé = 0;
  for (const section of sections) {
    if (!section.texte) {
      console.log(`  section ${String(section.index).padStart(2)} | MUETTE — ${(section.dwell / 1000).toFixed(1)}s sans narration`);
      continue;
    }
    const [reponse] = await client.synthesizeSpeech({
      input: { text: section.texte },
      voice: { languageCode: 'fr-FR', name: voix },
      audioConfig: { audioEncoding: 'MP3', speakingRate: debit },
    });
    const chemin = join(tmpdir(), `measure-vo-${section.index}.mp3`);
    writeFileSync(chemin, reponse.audioContent, 'binary');
    const duree = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${chemin}"`).toString().trim(),
    );
    unlinkSync(chemin);
    parlé += duree;

    const ecart = section.dwell / 1000 - duree;
    if (ecart < 0) coupures += 1;
    const verdict = ecart < 0 ? `COUPÉE de ${(-ecart).toFixed(1)}s` : `blanc ${ecart.toFixed(1)}s`;
    console.log(
      `  section ${String(section.index).padStart(2)} | voix ${duree.toFixed(1)}s | vidéo ` +
        `${(section.dwell / 1000).toFixed(1)}s | ${verdict}   ${section.titre}`,
    );
  }
  const total = sections.reduce((n, s) => n + s.dwell, 0) / 1000;
  console.log(`  narration ${parlé.toFixed(1)}s sur ${total.toFixed(1)}s de vidéo — ${((parlé / total) * 100).toFixed(1)} % parlé`);
}

process.exit(coupures > 0 ? 1 : 0);
