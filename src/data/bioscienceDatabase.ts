/**
 * JoyEarn Bioscience & Molecular Biology Curriculum
 * Grounded in UniProt, AlphaFold DB, PubChem, and Reactome biological standards.
 */

export interface BiologicalMolecule {
  id: string;
  name: string;
  category: 'Protein' | 'Nucleic Acid' | 'Metabolite' | 'Cofactor';
  chemicalFormula?: string;
  uniprotId?: string;
  pdbId?: string;
  pubchemCid?: number;
  organism: string;
  biologicalRole: string;
  funFact: string;
  molecularWeight: string;
  structureType: string;
  colorScheme: string; // Tailwind gradient
  keyResiduesOrAtoms: string[];
}

export const BIOSCIENCE_MOLECULES: BiologicalMolecule[] = [
  {
    id: 'hemoglobin',
    name: 'Hemoglobin (Hb)',
    category: 'Protein',
    uniprotId: 'P68871',
    pdbId: '4HHB',
    organism: 'Homo sapiens (Human)',
    biologicalRole: 'Transports vital oxygen molecules from lungs to tissues throughout the human body via four iron-binding heme pockets.',
    funFact: 'Each red blood cell contains approximately 270 million hemoglobin molecules!',
    molecularWeight: '64.5 kDa (Tetramer: 2 Alpha + 2 Beta chains)',
    structureType: 'Globular heterotetramer with 4 Heme prosthetic groups',
    colorScheme: 'from-rose-500 to-red-600',
    keyResiduesOrAtoms: ['Fe²⁺ (Iron center)', 'His92 (Proximal Histidine)', 'His63 (Distal Histidine)', 'Heme B']
  },
  {
    id: 'insulin',
    name: 'Insulin Hormone',
    category: 'Protein',
    uniprotId: 'P01308',
    pdbId: '4INS',
    organism: 'Homo sapiens (Human)',
    biologicalRole: 'Peptide hormone secreted by pancreatic beta cells that prompts cells to absorb glucose from the bloodstream, keeping blood sugar in healthy balance.',
    funFact: 'Insulin was the very first protein whose complete amino acid sequence was deciphered by Frederick Sanger in 1951.',
    molecularWeight: '5.8 kDa (51 amino acids across 2 chains)',
    structureType: 'Two polypeptide chains (A & B) linked by three disulfide bonds',
    colorScheme: 'from-amber-500 to-orange-600',
    keyResiduesOrAtoms: ['CysA6-CysA11 (Intrachain disulfide)', 'CysA7-CysB7 (Interchain disulfide)', 'Zinc-hexamer coordination']
  },
  {
    id: 'gfp',
    name: 'Green Fluorescent Protein (GFP)',
    category: 'Protein',
    uniprotId: 'P42212',
    pdbId: '1EMA',
    organism: 'Aequorea victoria (Crystal Jellyfish)',
    biologicalRole: 'Revolutionary biological imaging beacon that emits brilliant green fluorescence when exposed to blue light without requiring chemical reagents.',
    funFact: 'GFP discovery won the 2008 Nobel Prize in Chemistry because scientists can tag it to any living cell to watch biology happen in real-time!',
    molecularWeight: '26.9 kDa (238 amino acids)',
    structureType: '11-stranded Beta-barrel cylinder protecting an internal fluorophore',
    colorScheme: 'from-emerald-400 to-teal-500',
    keyResiduesOrAtoms: ['Ser65-Tyr66-Gly67 (Autocatalytic chromophore tripeptide)', 'Arg96', 'Glu222']
  },
  {
    id: 'atp',
    name: 'Adenosine Triphosphate (ATP)',
    category: 'Metabolite',
    chemicalFormula: 'C10H16N5O13P3',
    pubchemCid: 5957,
    organism: 'Universal to all living Earth organisms',
    biologicalRole: 'The universal chemical energy currency of the cell. Breaking its phosphoanhydride bond releases ~30.5 kJ/mol to power cellular work.',
    funFact: 'An active human recycles their own body weight in ATP molecules every single day!',
    molecularWeight: '507.18 g/mol',
    structureType: 'Adenine ring + Ribose sugar + 3 linked Phosphate groups (Alpha, Beta, Gamma)',
    colorScheme: 'from-indigo-500 to-purple-600',
    keyResiduesOrAtoms: ['Adenine base', 'Ribofuranose', 'Gamma-phosphate (High energy bond)', 'Mg²⁺ ion cofactor']
  },
  {
    id: 'dna_polymerase',
    name: 'DNA Double Helix & Replication',
    category: 'Nucleic Acid',
    chemicalFormula: 'Polynucleotide (Deoxyribose + Phosphate + Bases)',
    organism: 'All cellular life',
    biologicalRole: 'Stores the hereditary genetic instruction blueprint for building and maintaining every organ, cell, and enzyme in the body.',
    funFact: 'If uncoiled, the DNA inside a single human cell would measure over 2 meters long, packed tightly inside a microscopic nucleus!',
    molecularWeight: 'Variable (Billions of base pairs)',
    structureType: 'Right-handed B-DNA double antiparallel helix with major & minor grooves',
    colorScheme: 'from-blue-500 to-cyan-500',
    keyResiduesOrAtoms: ['A=T (2 Hydrogen bonds)', 'G≡C (3 Hydrogen bonds)', 'Phosphodiester backbone', 'Deoxyribose']
  },
  {
    id: 'chlorophyll',
    name: 'Chlorophyll A (Photosynthesis)',
    category: 'Cofactor',
    chemicalFormula: 'C55H72MgN4O5',
    pubchemCid: 123831,
    organism: 'Plants, Algae & Cyanobacteria',
    biologicalRole: 'Primary light-harvesting pigment that absorbs red and blue sunlight photons, exciting electrons to convert solar light into chemical sugars and oxygen.',
    funFact: 'Plants appear green specifically because chlorophyll absorbs red and blue wavelengths while reflecting the green wavelengths back to our eyes.',
    molecularWeight: '893.5 g/mol',
    structureType: 'Porphyrin ring with coordinated Magnesium center + Phytol lipophilic tail',
    colorScheme: 'from-lime-500 to-emerald-600',
    keyResiduesOrAtoms: ['Mg²⁺ (Magnesium core)', 'Chlorin ring', 'Phytol ester chain', 'Photosystem II P680 reaction center']
  }
];

export interface CodonMapping {
  codon: string;
  aminoAcid: string;
  singleLetter: string;
  name: string;
  property: string;
}

export const CODON_DICTIONARY: Record<string, CodonMapping> = {
  AUG: { codon: 'AUG', aminoAcid: 'Met', singleLetter: 'M', name: 'Methionine (Start Codon)', property: 'Nonpolar / Hydrophobic' },
  UUU: { codon: 'UUU', aminoAcid: 'Phe', singleLetter: 'F', name: 'Phenylalanine', property: 'Aromatic' },
  UUC: { codon: 'UUC', aminoAcid: 'Phe', singleLetter: 'F', name: 'Phenylalanine', property: 'Aromatic' },
  UUA: { codon: 'UUA', aminoAcid: 'Leu', singleLetter: 'L', name: 'Leucine', property: 'Aliphatic Hydrophobic' },
  UUG: { codon: 'UUG', aminoAcid: 'Leu', singleLetter: 'L', name: 'Leucine', property: 'Aliphatic Hydrophobic' },
  UCU: { codon: 'UCU', aminoAcid: 'Ser', singleLetter: 'S', name: 'Serine', property: 'Polar Uncharged' },
  UCC: { codon: 'UCC', aminoAcid: 'Ser', singleLetter: 'S', name: 'Serine', property: 'Polar Uncharged' },
  UAU: { codon: 'UAU', aminoAcid: 'Tyr', singleLetter: 'Y', name: 'Tyrosine', property: 'Aromatic' },
  UAC: { codon: 'UAC', aminoAcid: 'Tyr', singleLetter: 'Y', name: 'Tyrosine', property: 'Aromatic' },
  UAA: { codon: 'UAA', aminoAcid: 'Stop', singleLetter: '*', name: 'Ochre (Stop Signal)', property: 'Termination Codon' },
  UAG: { codon: 'UAG', aminoAcid: 'Stop', singleLetter: '*', name: 'Amber (Stop Signal)', property: 'Termination Codon' },
  UGA: { codon: 'UGA', aminoAcid: 'Stop', singleLetter: '*', name: 'Opal (Stop Signal)', property: 'Termination Codon' },
  UGU: { codon: 'UGU', aminoAcid: 'Cys', singleLetter: 'C', name: 'Cysteine', property: 'Forms Disulfide Bonds' },
  UGC: { codon: 'UGC', aminoAcid: 'Cys', singleLetter: 'C', name: 'Cysteine', property: 'Forms Disulfide Bonds' },
  UGG: { codon: 'UGG', aminoAcid: 'Trp', singleLetter: 'W', name: 'Tryptophan', property: 'Aromatic' },
  CCU: { codon: 'CCU', aminoAcid: 'Pro', singleLetter: 'P', name: 'Proline', property: 'Cyclic / Helix Breaker' },
  CAU: { codon: 'CAU', aminoAcid: 'His', singleLetter: 'H', name: 'Histidine', property: 'Positively Charged / Catalytic' },
  CAA: { codon: 'CAA', aminoAcid: 'Gln', singleLetter: 'Q', name: 'Glutamine', property: 'Polar Amide' },
  CGU: { codon: 'CGU', aminoAcid: 'Arg', singleLetter: 'R', name: 'Arginine', property: 'Positively Charged Basic' },
  AUU: { codon: 'AUU', aminoAcid: 'Ile', singleLetter: 'I', name: 'Isoleucine', property: 'Hydrophobic Aliphatic' },
  ACU: { codon: 'ACU', aminoAcid: 'Thr', singleLetter: 'T', name: 'Threonine', property: 'Polar Hydroxyl' },
  AAU: { codon: 'AAU', aminoAcid: 'Asn', singleLetter: 'N', name: 'Asparagine', property: 'Polar Amide' },
  AAA: { codon: 'AAA', aminoAcid: 'Lys', singleLetter: 'K', name: 'Lysine', property: 'Positively Charged Basic' },
  GUU: { codon: 'GUU', aminoAcid: 'Val', singleLetter: 'V', name: 'Valine', property: 'Hydrophobic Aliphatic' },
  GCU: { codon: 'GCU', aminoAcid: 'Ala', singleLetter: 'A', name: 'Alanine', property: 'Small Hydrophobic' },
  GAU: { codon: 'GAU', aminoAcid: 'Asp', singleLetter: 'D', name: 'Aspartic Acid', property: 'Negatively Charged Acidic' },
  GAA: { codon: 'GAA', aminoAcid: 'Glu', singleLetter: 'E', name: 'Glutamic Acid', property: 'Negatively Charged Acidic' },
  GGU: { codon: 'GGU', aminoAcid: 'Gly', singleLetter: 'G', name: 'Glycine', property: 'Smallest / Highly Flexible' },
};

/**
 * Transcribes DNA string to complementary mRNA
 */
export function transcribeDnaToRna(dnaSeq: string): string {
  return dnaSeq
    .toUpperCase()
    .replace(/\s+/g, '')
    .split('')
    .map((nt) => {
      if (nt === 'A') return 'U';
      if (nt === 'T') return 'A';
      if (nt === 'C') return 'G';
      if (nt === 'G') return 'C';
      return nt;
    })
    .join('');
}

/**
 * Translates RNA codons into an array of Amino Acids
 */
export function translateRnaToPeptide(rnaSeq: string): CodonMapping[] {
  const clean = rnaSeq.toUpperCase().replace(/\s+/g, '');
  const peptide: CodonMapping[] = [];
  for (let i = 0; i + 2 < clean.length; i += 3) {
    const codon = clean.slice(i, i + 3);
    const mapped = CODON_DICTIONARY[codon] || {
      codon,
      aminoAcid: 'Xaa',
      singleLetter: 'X',
      name: 'Unspecified Amino Acid',
      property: 'Unknown'
    };
    peptide.push(mapped);
    if (mapped.aminoAcid === 'Stop') break;
  }
  return peptide;
}
