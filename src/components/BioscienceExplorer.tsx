import React, { useState } from 'react';
import { BIOSCIENCE_MOLECULES, BiologicalMolecule, transcribeDnaToRna, translateRnaToPeptide, CodonMapping } from '../data/bioscienceDatabase';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface BioscienceExplorerProps {
  seniorMode?: boolean;
  onEarnPoints?: (points: number, reason: string) => void;
}

export const BioscienceExplorer: React.FC<BioscienceExplorerProps> = ({
  seniorMode = false,
  onEarnPoints,
}) => {
  const { light, success } = useHaptics();
  const [selectedMolecule, setSelectedMolecule] = useState<BiologicalMolecule>(BIOSCIENCE_MOLECULES[0]);
  const [activeTab, setActiveTab] = useState<'molecules' | 'dna_transcription'>('molecules');

  // DNA transcription & translation state
  const [dnaInput, setDnaInput] = useState('ATGCGATCGTAA');
  const [transcribedRna, setTranscribedRna] = useState(() => transcribeDnaToRna('ATGCGATCGTAA'));
  const [translatedPeptide, setTranslatedPeptide] = useState<CodonMapping[]>(() =>
    translateRnaToPeptide(transcribeDnaToRna('ATGCGATCGTAA'))
  );
  const [hasCompletedTranslation, setHasCompletedTranslation] = useState(false);

  const sampleDnaSequences = [
    { label: 'Start Coding Sequence', seq: 'ATGCGATCGTAA' },
    { label: 'Insulin Signal Segment', seq: 'ATGGCCCTGTGGATGCGC' },
    { label: 'GFP Chromophore Motif', seq: 'ATGAGCAAAGGAGAAGAA' },
  ];

  const handleTranscribeAndTranslate = (input: string) => {
    soundService.playClick();
    light();
    setDnaInput(input);
    const rna = transcribeDnaToRna(input);
    setTranscribedRna(rna);
    const peptide = translateRnaToPeptide(rna);
    setTranslatedPeptide(peptide);

    if (!hasCompletedTranslation && peptide.length > 0) {
      setHasCompletedTranslation(true);
      soundService.playSuccess();
      success();
      onEarnPoints?.(15, 'Completed DNA to Protein Translation Experiment 🧬');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black text-xl">
            🧬
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">
              {seniorMode ? 'حیاتیاتی سائنس اور مالیکیولز' : 'Bioscience & Molecular Explorer'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Proteins (AlphaFold/PDB), DNA Central Dogma, and Molecules of Life
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => {
              soundService.playClick();
              setActiveTab('molecules');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'molecules'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Molecules
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              setActiveTab('dna_transcription');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dna_transcription'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DNA Lab
          </button>
        </div>
      </div>

      {activeTab === 'molecules' ? (
        /* 3D MOLECULAR & PROTEIN CARDS */
        <div className="space-y-4">
          {/* Active Molecule Spotlight Card */}
          <div className="bg-gradient-to-br from-white via-slate-50/50 to-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600">
                  {selectedMolecule.category} • {selectedMolecule.organism}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{selectedMolecule.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedMolecule.structureType}</p>
              </div>

              {/* Molecule Category Tag */}
              <div className="px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-black">
                {selectedMolecule.molecularWeight}
              </div>
            </div>

            {/* Biological Role */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-1">Biological Function:</strong>
              {selectedMolecule.biologicalRole}
            </div>

            {/* Key Catalytic Atoms / Residues */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Key Molecular Elements & Active Sites
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedMolecule.keyResiduesOrAtoms.map((res) => (
                  <span
                    key={res}
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    {res}
                  </span>
                ))}
              </div>
            </div>

            {/* Scientific Identifiers (UniProt / PDB / PubChem) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                {selectedMolecule.uniprotId && (
                  <span className="font-mono text-[10.5px] bg-slate-100 px-2 py-0.5 rounded-md">
                    UniProt: {selectedMolecule.uniprotId}
                  </span>
                )}
                {selectedMolecule.pdbId && (
                  <span className="font-mono text-[10.5px] bg-slate-100 px-2 py-0.5 rounded-md">
                    PDB: {selectedMolecule.pdbId}
                  </span>
                )}
                {selectedMolecule.pubchemCid && (
                  <span className="font-mono text-[10.5px] bg-slate-100 px-2 py-0.5 rounded-md">
                    PubChem CID: {selectedMolecule.pubchemCid}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Molecule Selection Strip */}
          <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs space-y-2">
            <span className="text-xs text-slate-500 font-bold px-1 block">
              Explore Life's Essential Macromolecules
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BIOSCIENCE_MOLECULES.map((mol) => {
                const isSelected = selectedMolecule.id === mol.id;
                return (
                  <button
                    key={mol.id}
                    onClick={() => {
                      soundService.playClick();
                      light();
                      setSelectedMolecule(mol);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all tap-bounce ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 shadow-sm ring-2 ring-cyan-200'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-900 block truncate">{mol.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                      {mol.category} • {mol.structureType.slice(0, 24)}...
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* DNA TRANSCRIPTION & TRANSLATION LAB */
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-sm font-black text-slate-900">DNA to Protein Central Dogma Lab</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Type or select a DNA coding strand to transcribe mRNA and translate into functional amino acids.
            </p>
          </div>

          {/* Sample Sequence Presets */}
          <div className="flex gap-1.5 flex-wrap">
            {sampleDnaSequences.map((sample) => (
              <button
                key={sample.seq}
                onClick={() => handleTranscribeAndTranslate(sample.seq)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold tap-bounce"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* DNA Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Template DNA Strand (A, T, C, G)
            </label>
            <input
              type="text"
              value={dnaInput}
              onChange={(e) => handleTranscribeAndTranslate(e.target.value.toUpperCase().replace(/[^ATCG]/g, ''))}
              placeholder="e.g. ATGCGATCGTAA"
              className="w-full px-3.5 py-2.5 font-mono text-sm uppercase rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 font-bold tracking-widest text-slate-800"
            />
          </div>

          {/* Complementary mRNA Strand */}
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
              <span>Transcribed Messenger RNA (mRNA)</span>
              <span className="text-[10px] text-blue-600 font-normal">Replaces T with U</span>
            </div>
            <p className="font-mono text-sm tracking-widest text-blue-950 font-black break-all">
              {transcribedRna || '(Enter DNA bases above)'}
            </p>
          </div>

          {/* Translated Polypeptide Chain */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
              <span>Translated Polypeptide Chain</span>
              <span className="text-[10px] text-emerald-700">{translatedPeptide.length} Amino Acids</span>
            </div>

            {translatedPeptide.length === 0 ? (
              <p className="text-xs text-emerald-700 italic">Enter at least 3 nucleotides (1 codon) to translate.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {translatedPeptide.map((aa, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white rounded-xl border border-emerald-300 shadow-2xs text-center min-w-14"
                  >
                    <span className="text-[10px] font-mono text-slate-400 block">{aa.codon}</span>
                    <span className="text-xs font-black text-emerald-800 block">{aa.aminoAcid}</span>
                    <span className="text-[9px] text-slate-500 block truncate max-w-16">{aa.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
