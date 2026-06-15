import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Image as ImageIcon, Download, Check } from 'lucide-react';

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  shadow: number;
  highlight: number;
  structure: number;
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  shadow: 0,
  highlight: 0,
  structure: 0,
};

export default function PhotoEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setAdjustments(DEFAULT_ADJUSTMENTS);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdjustmentChange = (key: keyof Adjustments, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  };

  const getFilterStyle = () => {
    // Basic CSS filters
    const brightness = `brightness(${adjustments.brightness}%)`;
    const contrast = `contrast(${adjustments.contrast}%)`;
    const saturation = `saturate(${adjustments.saturation}%)`;
    const blur = `blur(${adjustments.blur}px)`;
    
    // We simulate shadow/highlight/structure with some basic opacity overlays or just CSS filter tricks where possible, 
    // but applying them mathematically would require a canvas. For this simple editor we use CSS filters.
    // Shadow & Highlight simulation via combined contrast/brightness tweaks
    const simulatedContrast = adjustments.contrast + adjustments.structure * 0.5;
    const finalContrast = `contrast(${simulatedContrast}%)`;

    return {
      filter: `${brightness} ${finalContrast} ${saturation} ${blur}`,
    };
  };

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-[#050505] text-white font-sans overflow-hidden p-4 md:p-8 gap-6">
      <div className="flex-1 flex flex-col pt-8 md:pt-0">
        <h2 className="text-2xl font-serif tracking-[0.1em] mb-6 text-white/80 uppercase px-4 md:px-0">Photo Editor</h2>
        
        <div className="flex-1 relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center backdrop-blur-sm min-h-[40vh]">
          {image ? (
            <img 
              src={image} 
              alt="Editor preview" 
              className="max-w-full max-h-full object-contain transition-all duration-200"
              style={getFilterStyle()}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/30 p-8 text-center">
              <ImageIcon size={48} className="mb-4 opacity-50" strokeWidth={1} />
              <p className="text-sm tracking-widest uppercase mb-6">No image selected</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 transition-colors border border-white/10 rounded-full text-xs tracking-widest uppercase text-white"
              >
                Upload Photo
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-[320px] lg:w-[400px] flex flex-col gap-6 pt-8 md:pt-14 pb-24 md:pb-0">
        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[28px] p-6 shadow-2xl flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-mono tracking-widest uppercase text-white/50">Adjustments</h3>
            {image && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Change Photo"
              >
                <Upload size={14} className="text-white/70" />
              </button>
            )}
          </div>
          
          <div className="space-y-6">
            <Slider label="Brightness" min={0} max={200} value={adjustments.brightness} onChange={(v) => handleAdjustmentChange('brightness', v)} />
            <Slider label="Contrast" min={0} max={200} value={adjustments.contrast} onChange={(v) => handleAdjustmentChange('contrast', v)} />
            <Slider label="Saturation" min={0} max={200} value={adjustments.saturation} onChange={(v) => handleAdjustmentChange('saturation', v)} />
            <Slider label="Blur" min={0} max={20} value={adjustments.blur} onChange={(v) => handleAdjustmentChange('blur', v)} />
            
            <div className="h-[1px] w-full bg-white/10 my-4" />
            
            <Slider label="Shadow" min={-100} max={100} value={adjustments.shadow} onChange={(v) => handleAdjustmentChange('shadow', v)} />
            <Slider label="Highlight" min={-100} max={100} value={adjustments.highlight} onChange={(v) => handleAdjustmentChange('highlight', v)} />
            <Slider label="Structure" min={-100} max={100} value={adjustments.structure} onChange={(v) => handleAdjustmentChange('structure', v)} />
          </div>
        </div>
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />
    </div>
  );
}

function Slider({ label, min, max, value, onChange }: { label: string, min: number, max: number, value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-mono tracking-widest uppercase text-white/70">{label}</label>
        <span className="text-[10px] font-mono text-white/40 w-8 text-right">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer focus:outline-none"
      />
    </div>
  );
}
