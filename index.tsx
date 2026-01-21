import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from "react-markdown";

// --- Types & Constants ---

type Language = 'en' | 'ur';

interface DataInputs {
  field: string;
  handSpecimen: string;
  microscopy: string;
  geochemistry: string;
  remoteSensing: string;
}

interface Attachment {
  id: string;
  file: File;
  previewUrl?: string; // For images
  type: 'image' | 'pdf' | 'text' | 'other';
}

type AttachmentsMap = Record<keyof DataInputs, Attachment[]>;

const INITIAL_INPUTS: DataInputs = {
  field: "",
  handSpecimen: "",
  microscopy: "",
  geochemistry: "",
  remoteSensing: ""
};

const INITIAL_ATTACHMENTS: AttachmentsMap = {
  field: [],
  handSpecimen: [],
  microscopy: [],
  geochemistry: [],
  remoteSensing: []
};

// --- Translations & Config ---

const LABELS = {
  en: {
    title: "Ore & Economic Geology AI",
    subtitle: "AI-Assisted Mineral Exploration Expert",
    field: "Field & Outcrop",
    handSpecimen: "Hand Specimen",
    microscopy: "Microscopy (Thin Section)",
    geochem: "Geochemistry",
    remote: "Satellite / Remote Sensing",
    analyze: "Run Full Analysis",
    analyzing: "Analyzing...",
    clear: "Clear All",
    modules: "Modules",
    results: "Analysis Results",
    heatmap: "Heat Map Logic",
    heatmapDesc: "Generate Python/GIS Logic",
    inputPlaceholder: "Enter observations...",
    searchPlaceholder: "Search modules...",
    noResults: "No matches found",
    module1: "1. Geological Context",
    module2: "2. Structural Intelligence",
    module3: "3. Ore Petrography",
    module4: "4. Geochemical Intelligence",
    module5: "5. Spectral AI",
    module6: "6. Heat-Map Fusion",
    developer: "Expert App Developer: Muhammad Yasin Khan",
    poweredBy: "Powered By: Gemini 3 Pro Preview",
    upload: "Upload",
    camera: "Camera",
    attachFiles: "Attach Images, PDF, CSV...",
    remove: "Remove"
  },
  ur: {
    title: "معدنیات اور اقتصادی ارضیات AI",
    subtitle: "AI کی مدد سے معدنی تلاش کا ماہر",
    field: "فیلڈ اور آؤٹ کراپ",
    handSpecimen: "ہینڈ اسپیسیمین",
    microscopy: "مائیکروسکوپی (تھین سیکشن)",
    geochem: "جیو کیمسٹری",
    remote: "سیٹلائٹ / ریموٹ سینسنگ",
    analyze: "مکمل تجزیہ چلائیں",
    analyzing: "تجزیہ جاری ہے...",
    clear: "سب صاف کریں",
    modules: "ماڈیولز",
    results: "تجزیاتی نتائج",
    heatmap: "ہیٹ میپ لاجک",
    heatmapDesc: "Python/GIS کوڈ بنائیں",
    inputPlaceholder: "مشاہدات درج کریں...",
    searchPlaceholder: "ماڈیولز تلاش کریں...",
    noResults: "کوئی مماثلت نہیں ملی",
    module1: "1. ارضیاتی سیاق و سباق",
    module2: "2. ساختی ذہانت",
    module3: "3. Ore Petrography",
    module4: "4. جیو کیمیکل ذہانت",
    module5: "5. Spectral AI",
    module6: "6. Heat-Map Fusion",
    developer: "ایکسپرٹ ایپ ڈویلپر: محمد یاسین خان",
    poweredBy: "پاورڈ بائے: Gemini 3 Pro Preview",
    upload: "اپ لوڈ",
    camera: "کیمرہ",
    attachFiles: "تصاویر، پی ڈی ایف، سی ایس وی منسلک کریں...",
    remove: "ہٹائیں"
  }
};

const MODULE_DESCRIPTIONS = {
  en: {
    module1: "Analyzes tectonic setting and lithology to identify permissive mineral systems.",
    module2: "Evaluates faults and veins to determine fluid pathway probabilities.",
    module3: "Interprets ore textures and mineral stages to build a paragenetic model.",
    module4: "Detects elemental anomalies and pathfinder clusters from geochemical data.",
    module5: "Uses spectral data to map alteration zones (clays, iron oxides).",
    module6: "Combines all data layers to rank prospectivity targets (High/Med/Low)."
  },
  ur: {
    module1: "معدنی نظام کی شناخت کے لیے ٹیکٹونک اور چٹانی ساخت کا تجزیہ کرتا ہے۔",
    module2: "فلوئیڈ کے راستوں کے لیے فالٹس اور رگوں کا جائزہ لیتا ہے۔",
    module3: "Ore کی ساخت اور معدنی مراحل کا ماڈل بناتا ہے۔",
    module4: "جیو کیمیکل ڈیٹا سے عناصر کی بے قاعدگیوں کی نشاندہی کرتا ہے۔",
    module5: "Alteration زونز کے نقشے بنانے کے لیے اسپیکٹرل ڈیٹا استعمال کرتا ہے۔",
    module6: "تمام ڈیٹا کو ملا کر تلاش کے اہداف کی درجہ بندی کرتا ہے۔"
  }
};

const PLACEHOLDERS = {
  en: {
    field: "e.g., Host lithology, stratigraphic position, faults, shear zones, alteration zones...",
    handSpecimen: "e.g., Ore textures, mineral assemblages, gangue minerals...",
    microscopy: "e.g., Reflected light mineralogy, replacement textures, zoning...",
    geochemistry: "e.g., Major oxides, trace elements, pathfinder ratios (Cu, Au, Mo)...",
    remoteSensing: "e.g., Alteration indices, lineament density, spectral anomalies..."
  },
  ur: {
    field: "مثال: میزبان چٹان کی قسم، اسٹریٹیگرافی، فالٹس، شیئر زونز...",
    handSpecimen: "مثال: Ore کی ساخت، معدنی مجموعے، گینگ منرلز...",
    microscopy: "مثال: مائیکروسکوپ کے تحت معدنی شناخت، replacement textures...",
    geochemistry: "مثال: میجر، ٹریس عناصر، pathfinder تناسب...",
    remoteSensing: "مثال: Alteration indices، lineaments، spectral heat maps..."
  }
};

// --- API Logic ---

const systemInstructionEn = `
You are a Senior Economic Geologist and AI-assisted Mineral Exploration Expert, specialized in ore deposits, mineral systems, structural controls, geochemistry, ore microscopy, and satellite-based exploration. You operate at research, academic, and industry exploration standards.

Your Tasks:
1. Classify the deposit (Porphyry, Epithermal, VMS, Skarn, IOCG, Orogenic Gold, etc.) with explicit justification and confidence level.
2. Analyze Mineralization Patterns (Structural vs lithological control, Zonation).
3. Suggest Heat-Map Classifications (Ore cores, Alteration halos).
4. Build a Genetic Model (Metal source, fluid evolution, PT conditions).
5. Provide Exploration Targets.

Output Format:
1. Ore Deposit Type + Confidence %
2. Diagnostic Evidence (Field -> Lab -> Satellite)
3. Mineral Assemblage & Paragenesis
4. Heat Map Interpretation
5. Genetic Model
6. Exploration Targets & Recommendations
`;

const systemInstructionUr = `
آپ ایک سینئر اکنامک جیولوجسٹ اور AI پر مبنی معدنی تلاش کے ماہر ہیں، جنہیں ore deposits، معدنی نظام، ساختی کنٹرول، جیوا کیمسٹری، ore microscopy اور سیٹلائٹ ڈیٹا میں مہارت حاصل ہے۔ آپ تحقیقی، تعلیمی اور انڈسٹری معیار پر کام کرتے ہیں۔

آپ کے فرائض:
1. ore deposit کی قسم کی شناخت کریں (Porphyry، Epithermal، VMS، Skarn وغیرہ) اور اعتماد کی سطح بیان کریں۔
2. Mineralization Pattern کا تجزیہ کریں (ساختی یا lithological کنٹرول)۔
3. Heat-Map کی درجہ بندی تجویز کریں (ore cores, alteration halos)۔
4. Genetic Model بنائیں (دھات کے ماخذ، فلوئیڈ ارتقاء، درجہ حرارت و دباؤ)۔
5. تلاش کے اہداف (Exploration Targets) فراہم کریں۔

آؤٹ پٹ فارمیٹ:
1. Ore Deposit Type + Confidence %
2. Diagnostic Evidence (Field -> Lab -> Satellite)
3. Mineral Assemblage & Paragenesis
4. Heat Map Interpretation
5. Genetic Model
6. Exploration Targets & Recommendations

جواب اردو میں دیں۔ تکنیکی اصطلاحات انگریزی میں بھی لکھ سکتے ہیں۔
`;

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } } | { text: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Check if it's a text file
    if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
      reader.onloadend = () => {
        resolve({ text: `\n[File Attachment: ${file.name}]\n${reader.result as string}\n` });
      };
      reader.readAsText(file);
    } else {
      // Binary (Image/PDF)
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          },
        });
      };
      reader.readAsDataURL(file);
    }
    reader.onerror = reject;
  });
};

// --- Components ---

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [inputs, setInputs] = useState<DataInputs>(INITIAL_INPUTS);
  const [attachments, setAttachments] = useState<AttachmentsMap>(INITIAL_ATTACHMENTS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'inputs' | 'results' | 'heatmap'>('inputs');
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (field: keyof DataInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttachment = (field: keyof DataInputs, files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text'
    }));
    
    setAttachments(prev => ({
      ...prev,
      [field]: [...prev[field], ...newAttachments]
    }));
  };

  const handleRemoveAttachment = (field: keyof DataInputs, id: string) => {
    setAttachments(prev => ({
      ...prev,
      [field]: prev[field].filter(att => att.id !== id)
    }));
  };

  const clearInputs = () => {
    setInputs(INITIAL_INPUTS);
    setAttachments(INITIAL_ATTACHMENTS);
    setResult("");
  };

  const runAnalysis = async (specificModule?: string) => {
    // API key must be obtained from process.env.API_KEY
    if (!process.env.API_KEY) return alert("API Key missing");
    setLoading(true);
    setActiveTab('results');
    setResult(""); // Clear previous result

    try {
      // Create a new instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelId = 'gemini-3-pro-preview';
      
      let userPrompt = "";
      const tLabels = LABELS[language];
      
      // Construct the text summary
      const inputSummary = `
--- INPUT DATA ---
${tLabels.field}: ${inputs.field || "N/A"}
${tLabels.handSpecimen}: ${inputs.handSpecimen || "N/A"}
${tLabels.microscopy}: ${inputs.microscopy || "N/A"}
${tLabels.geochem}: ${inputs.geochemistry || "N/A"}
${tLabels.remote}: ${inputs.remoteSensing || "N/A"}
`;

      let mainPromptText = "";
      if (specificModule) {
        mainPromptText = `Run specific module analysis: ${specificModule}.\n${inputSummary}`;
      } else if (activeTab === 'heatmap' && specificModule === 'Generate Python Code') {
         mainPromptText = `Generate a comprehensive Python script using pandas, numpy, and matplotlib/seaborn to create a geochemical heat map.
         
         CRITICAL REQUIREMENT: The script must include clear, easily editable variables at the very top for FILE PATHS.
         
         Structure the script code as follows:
         1. CONFIGURATION SECTION (Top of script):
            - Define variable \`DATA_FILE_PATH = "path/to/your/data.csv"\` (Comment: User must replace this)
            - Define variable \`OUTPUT_IMAGE_PATH = "path/to/your/output_heatmap.png"\` (Comment: User must replace this)
            - Define variable \`COORDINATE_COLS = ['X', 'Y']\` (or similar placeholder)
            - Define variable \`ELEMENT_COLS\` based on the deposit type inferred from inputs.

         2. LOGIC:
            - Load data from \`DATA_FILE_PATH\`.
            - Normalize element values (e.g., MinMaxScaler).
            - Weight elements based on the deposit model inferred from: ${inputs.field} ${inputs.geochemistry}
            - Calculate a Composite Heat Index.
            - Generate the visualization (e.g. Scatter or Interpolated Map).
            - Save the plot to \`OUTPUT_IMAGE_PATH\`.

         3. INSTRUCTIONS:
             - Briefly explain how the user should change the paths.

         Output ONLY the Python code and the instructions.
         `;
      } else {
        mainPromptText = `Perform a full Economic Geology Analysis based on the provided multi-scale data.\n${inputSummary}`;
      }

      // Collect all parts (text + attachments)
      const parts: any[] = [{ text: mainPromptText }];

      // Process attachments from all fields
      const allAttachments = (Object.values(attachments) as Attachment[][]).flat();
      for (const att of allAttachments) {
        const part = await fileToGenerativePart(att.file);
        parts.push(part);
      }

      const systemInstruction = language === 'en' ? systemInstructionEn : systemInstructionUr;

      // Use generateContent with model and contents directly
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        contents: { role: 'user', parts: parts },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4, // Lower temperature for more factual/analytical results
        }
      });

      // Directly access .text property
      const text = response.text || "No analysis generated.";
      setResult(text);

    } catch (error) {
      console.error(error);
      setResult(language === 'en' ? "Error generating analysis. Please check console." : "تجزیہ کرنے میں خرابی۔ براہ کرم کنسول چیک کریں۔");
    } finally {
      setLoading(false);
    }
  };

  const t = LABELS[language];
  const d = MODULE_DESCRIPTIONS[language];
  const p = PLACEHOLDERS[language];

  // Filtering Logic
  const dataInputLabel = language === 'en' ? 'Multi-Scale Data' : 'ڈیٹا ان پٹ';
  const showDataInput = dataInputLabel.toLowerCase().includes(searchQuery.toLowerCase());

  const moduleList = [
    { label: t.module1, description: d.module1 },
    { label: t.module2, description: d.module2 },
    { label: t.module3, description: d.module3 },
    { label: t.module4, description: d.module4 },
    { label: t.module5, description: d.module5 },
    { label: t.module6, description: d.module6 },
  ];

  const filteredModules = moduleList.filter(m => 
    m.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toolList = [
    { label: t.heatmap, icon: "fa-map-location-dot", tab: 'heatmap' as const },
    { label: t.results, icon: "fa-scroll", tab: 'results' as const },
  ];

  const filteredTools = toolList.filter(tool => 
    tool.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasAnyMatch = showDataInput || filteredModules.length > 0 || filteredTools.length > 0;

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 ${language === 'ur' ? 'font-urdu' : ''}`}>
      
      {/* --- HEADER --- */}
      <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-900 font-bold text-xl shadow-amber-900/20 shadow-lg">
            <i className="fa-solid fa-gem"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 leading-tight">
              {t.title}
            </h1>
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">
              {t.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => setLanguage(l => l === 'en' ? 'ur' : 'en')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm font-medium"
        >
          <i className="fa-solid fa-language text-amber-500"></i>
          <span>{language === 'en' ? 'English' : 'اردو'}</span>
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT SIDEBAR (Navigation) --- */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
          {/* Search Bar */}
          <div className="p-4 flex-none">
            <div className="relative group">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors text-xs"></i>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  <i className="fa-solid fa-circle-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto pt-0">
            {showDataInput && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Data Input</div>
                <SidebarBtn 
                  active={activeTab === 'inputs'} 
                  onClick={() => setActiveTab('inputs')} 
                  icon="fa-layer-group" 
                  label={dataInputLabel} 
                />
              </>
            )}
            
            {filteredModules.length > 0 && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">{t.modules}</div>
                {filteredModules.map((m, idx) => (
                  <div key={idx} className="w-full">
                    <SidebarModuleBtn 
                      onClick={() => runAnalysis(m.label)} 
                      label={m.label} 
                      description={m.description} 
                    />
                  </div>
                ))}
              </>
            )}

            {filteredTools.length > 0 && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-2">Tools</div>
                {filteredTools.map((tool, idx) => (
                  <div key={idx} className="w-full">
                    <SidebarBtn 
                      active={activeTab === tool.tab} 
                      onClick={() => setActiveTab(tool.tab)} 
                      icon={tool.icon} 
                      label={tool.label} 
                    />
                  </div>
                ))}
              </>
            )}

            {!hasAnyMatch && (
              <div className="text-center py-8 px-2">
                <i className="fa-solid fa-magnifying-glass text-slate-800 text-3xl mb-3"></i>
                <p className="text-xs text-slate-500 italic">{t.noResults}</p>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
            <p>{t.poweredBy}</p>
          </div>
        </aside>

        {/* --- CENTER CONTENT --- */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              
              {activeTab === 'inputs' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-amber-400 border-b-2 border-amber-400/20 pb-2">
                      {language === 'en' ? 'Data Entry: Multi-Scale Observations' : 'ڈیٹا ان پٹ: کثیر پیمانے پر مشاہدات'}
                    </h2>
                    <button onClick={clearInputs} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                      {t.clear}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputCard 
                      icon="fa-mountain" 
                      title={t.field} 
                      value={inputs.field} 
                      onChange={(v) => handleInputChange('field', v)} 
                      placeholder={p.field}
                      attachments={attachments.field}
                      onAddAttachment={(files) => handleAddAttachment('field', files)}
                      onRemoveAttachment={(id) => handleRemoveAttachment('field', id)}
                      labels={t}
                    />
                    <InputCard 
                      icon="fa-gem" 
                      title={t.handSpecimen} 
                      value={inputs.handSpecimen} 
                      onChange={(v) => handleInputChange('handSpecimen', v)} 
                      placeholder={p.handSpecimen}
                      attachments={attachments.handSpecimen}
                      onAddAttachment={(files) => handleAddAttachment('handSpecimen', files)}
                      onRemoveAttachment={(id) => handleRemoveAttachment('handSpecimen', id)}
                      labels={t}
                    />
                    <InputCard 
                      icon="fa-microscope" 
                      title={t.microscopy} 
                      value={inputs.microscopy} 
                      onChange={(v) => handleInputChange('microscopy', v)} 
                      placeholder={p.microscopy}
                      attachments={attachments.microscopy}
                      onAddAttachment={(files) => handleAddAttachment('microscopy', files)}
                      onRemoveAttachment={(id) => handleRemoveAttachment('microscopy', id)}
                      labels={t}
                    />
                    <InputCard 
                      icon="fa-flask" 
                      title={t.geochem} 
                      value={inputs.geochemistry} 
                      onChange={(v) => handleInputChange('geochemistry', v)} 
                      placeholder={p.geochemistry}
                      attachments={attachments.geochemistry}
                      onAddAttachment={(files) => handleAddAttachment('geochemistry', files)}
                      onRemoveAttachment={(id) => handleRemoveAttachment('geochemistry', id)}
                      labels={t}
                    />
                    <InputCard 
                      icon="fa-satellite" 
                      title={t.remote} 
                      value={inputs.remoteSensing} 
                      onChange={(v) => handleInputChange('remoteSensing', v)} 
                      placeholder={p.remoteSensing}
                      fullWidth
                      attachments={attachments.remoteSensing}
                      onAddAttachment={(files) => handleAddAttachment('remoteSensing', files)}
                      onRemoveAttachment={(id) => handleRemoveAttachment('remoteSensing', id)}
                      labels={t}
                    />
                  </div>

                  <div className="flex justify-end pt-6">
                     <button
                      onClick={() => runAnalysis()}
                      disabled={loading}
                      className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-bold text-white transition-all duration-200 bg-amber-600 font-pj rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:shadow-[0_0_25px_rgba(217,119,6,0.5)]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-circle-notch fa-spin"></i> {t.analyzing}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-bolt"></i> {t.analyze}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="animate-fadeIn h-full flex flex-col">
                  <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
                    <i className="fa-solid fa-file-contract"></i> {t.results}
                  </h2>
                  
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                      <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                      <p className="animate-pulse">{t.analyzing}</p>
                    </div>
                  ) : result ? (
                     <div className="prose prose-invert prose-amber max-w-none markdown-body bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                        <ReactMarkdown>{result}</ReactMarkdown>
                     </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                      <i className="fa-solid fa-microscope text-4xl mb-4 text-slate-700"></i>
                      <p>{language === 'en' ? "No analysis run yet. Enter data and click Analyze." : "ابھی تک کوئی تجزیہ نہیں ہوا۔ ڈیٹا درج کریں اور تجزیہ پر کلک کریں۔"}</p>
                      <button onClick={() => setActiveTab('inputs')} className="mt-4 text-amber-500 hover:text-amber-400 font-medium">
                        {language === 'en' ? "Go to Inputs" : "ان پٹ پر جائیں"} &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'heatmap' && (
                 <div className="animate-fadeIn space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                       <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                        <i className="fa-solid fa-map-location-dot"></i> {t.heatmap}
                      </h2>
                      <button 
                        onClick={() => runAnalysis('Generate Python Code')}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                      >
                         <i className="fa-brands fa-python mr-2"></i>
                         {language === 'en' ? "Generate Python Script" : "Python اسکرپٹ بنائیں"}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Conceptual Card */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-4"><i className="fa-solid fa-layer-group text-amber-500 mr-2"></i>Logic Flow</h3>
                        <div className="space-y-4 text-sm text-slate-300">
                           <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500">1</div>
                              <div>
                                <p className="font-semibold text-white">Normalization</p>
                                <p className="opacity-70">MinMaxScaler (0-1) for all elements.</p>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500">2</div>
                              <div>
                                <p className="font-semibold text-white">Deposit Weighting</p>
                                <p className="opacity-70">Assign weights based on target (e.g., Cu 0.3, Au 0.25).</p>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500">3</div>
                              <div>
                                <p className="font-semibold text-white">Heat Index</p>
                                <code className="bg-slate-950 px-2 py-1 rounded text-amber-500 block mt-1">sum(norm_val * weight)</code>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500">4</div>
                              <div>
                                <p className="font-semibold text-white">GIS Visualization</p>
                                <p className="opacity-70">KDE / IDW Interpolation.</p>
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Visualizer Placeholder */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-center items-center text-center relative overflow-hidden group">
                         <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_copper_mine_production.svg')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity"></div>
                         <div className="z-10">
                           <i className="fa-solid fa-chart-area text-5xl text-amber-500 mb-4 drop-shadow-lg"></i>
                           <h3 className="text-lg font-bold text-white">Heat-Map Fusion</h3>
                           <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                             {language === 'en' 
                               ? "Use the 'Generate Python Script' button to create a custom script for your local data." 
                               : "اپنے مقامی ڈیٹا کے لیے حسب ضرورت اسکرپٹ بنانے کے لیے اوپر والا بٹن استعمال کریں۔"}
                           </p>
                         </div>
                      </div>
                    </div>

                    {/* Code Output Area */}
                     {activeTab === 'heatmap' && result && (
                      <div className="mt-8">
                         <h3 className="text-lg font-semibold text-white mb-2">Generated Logic</h3>
                         <div className="prose prose-invert prose-amber max-w-none markdown-body bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                            <ReactMarkdown>{result}</ReactMarkdown>
                         </div>
                      </div>
                    )}
                 </div>
              )}

            </div>
          </div>
          
          {/* Footer Info */}
          <div className="p-2 text-center text-[10px] text-slate-700 bg-slate-950 border-t border-slate-900">
            {t.developer} | {t.poweredBy}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

// Use defined interfaces for props to resolve key mapping and async handler issues
interface SidebarBtnProps {
  active: boolean;
  onClick: () => void | Promise<void>;
  icon: string;
  label: string;
}

function SidebarBtn({ active, onClick, icon, label }: SidebarBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      <i className={`fa-solid ${icon} w-5 text-center`}></i>
      {label}
    </button>
  );
}

interface SidebarModuleBtnProps {
  onClick: () => void | Promise<void>;
  label: string;
  description: string;
}

function SidebarModuleBtn({ onClick, label, description }: SidebarModuleBtnProps) {
  return (
    <div className="group w-full">
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
        title={label}
      >
        <div className="flex items-center truncate">
            <i className="fa-solid fa-chevron-right text-[10px] mr-2 opacity-50 group-hover:text-amber-500 transition-colors"></i>
            <span className="truncate">{label}</span>
        </div>
      </button>
      {/* Description block - visible on group hover */}
      <div className="hidden group-hover:block px-4 py-2 text-xs text-slate-500 bg-slate-900/50 border-l-2 border-slate-800 ml-3 mb-1 italic animate-fadeIn">
        {description}
      </div>
    </div>
  );
}

interface InputCardProps {
  icon: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  fullWidth?: boolean;
  attachments?: Attachment[];
  onAddAttachment?: (files: FileList | null) => void;
  onRemoveAttachment?: (id: string) => void;
  labels?: any;
}

function InputCard({ icon, title, value, onChange, placeholder, fullWidth, attachments, onAddAttachment, onRemoveAttachment, labels }: InputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) files.push(blob);
      }
    }
    if (files.length > 0 && onAddAttachment) {
      // Create a DataTransfer to mimic FileList
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      onAddAttachment(dt.files);
    }
  };

  return (
    <div className={`bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/50 transition-all ${fullWidth ? 'md:col-span-2' : ''} flex flex-col`}>
      <div className="flex items-center justify-between mb-3 text-amber-500">
        <div className="flex items-center gap-2">
          <i className={`fa-solid ${icon}`}></i>
          <label className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</label>
        </div>
      </div>
      
      <div className="relative flex-1">
        <textarea
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 min-h-[120px] resize-y text-sm leading-relaxed mb-3"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
        ></textarea>
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2">
          {/* File Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 text-xs font-medium border border-slate-700 transition-colors"
            title="Browse Files"
          >
            <i className="fa-solid fa-paperclip"></i>
            {labels?.upload || "Upload"}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => onAddAttachment && onAddAttachment(e.target.files)} 
            className="hidden" 
            multiple 
            accept="image/*,.pdf,.csv,.json,.txt,.md"
          />

          {/* Camera Button */}
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 text-xs font-medium border border-slate-700 transition-colors"
            title="Take Photo"
          >
            <i className="fa-solid fa-camera"></i>
            {labels?.camera || "Camera"}
          </button>
          <input 
            type="file" 
            ref={cameraInputRef} 
            onChange={(e) => onAddAttachment && onAddAttachment(e.target.files)} 
            className="hidden" 
            accept="image/*" 
            capture="environment"
          />
          
          <span className="text-[10px] text-slate-600 ml-auto italic hidden sm:inline-block">
            {labels?.attachFiles || "Images, PDF, Text"}
          </span>
        </div>

        {/* Attachment List */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative group bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center pr-6 overflow-hidden max-w-[150px]">
                {att.type === 'image' && att.previewUrl ? (
                  <img src={att.previewUrl} alt="preview" className="w-8 h-8 rounded object-cover mr-2 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center mr-2 flex-shrink-0 text-slate-500">
                    <i className={`fa-solid ${att.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-lines'}`}></i>
                  </div>
                )}
                <span className="text-[10px] text-slate-300 truncate">{att.file.name}</span>
                <button 
                  onClick={() => onRemoveAttachment && onRemoveAttachment(att.id)}
                  className="absolute right-0 top-0 bottom-0 px-1.5 bg-red-900/20 hover:bg-red-900/50 text-red-500 transition-colors flex items-center justify-center"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);