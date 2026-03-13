
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { 
  Briefcase, 
  Target, 
  Mail, 
  Linkedin, 
  BarChart2, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy,
  Download,
  X,
  Phone,
  MessageSquare,
  Globe,
  Mail as MailIcon,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
  Volume2,
  Square,
  Share2,
  CopyCheck,
  HelpCircle,
  Edit2,
  Zap,
  ShieldCheck,
  Rocket,
  Users,
  Layout,
  ChevronDown,
  BookOpen,
  Info,
  ExternalLink,
  ShieldAlert,
  Terminal,
  Scale,
  Award,
  Gavel,
  Check,
  ArrowLeft,
  Lightbulb,
  BadgeCheck,
  TrendingUp,
  MapPin,
  Send,
  User,
  Bot,
  Sparkles,
  RotateCcw,
  Trash2,
  GraduationCap,
  CheckSquare,
  Square as CheckboxIcon,
  ArrowRight,
  Menu,
  DollarSign,
  Contact,
  HardHat,
  Monitor,
  Eye,
  Calendar,
  Layers,
  Hash,
  TrendingUp as TrendingIcon,
  Sparkle,
  TriangleAlert,
  Clock,
  Zap as ZapIcon,
  Power,
  Activity,
  Filter,
  History,
  Ban,
  LifeBuoy,
  Cpu,
  Minus,
  PieChart,
  Trophy,
  Activity as ActivityIcon,
  /* Added missing Cloud icon import */
  Cloud
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { WorkforceProfile, EmployerMatch, OutreachAssets, LinkedInPost, Step } from './types';
import { enhanceProfile, discoverEmployers, generateOutreach, generateLinkedInCalendar, generatePostGraphic, generateSpeech, getSupportExpertResponse } from './geminiService';

// Message type for local chat
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

// Initial Form State Definition - Deep frozen to prevent accidental mutation
const INITIAL_FORM_STATE = Object.freeze({
  title: '',
  region: '',
  industries: '',
  wageRange: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  programLink: '',
  currentPartners: '',
  pastPartners: '',
  termsAccepted: false,
  emailPolicyAccepted: false
});

const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden', 'United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland'
];

// Audio decoding utilities
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Lightweight Markdown-to-React Parser (Chunk 4 Refinement)
const MarkdownText = ({ text }: { text: string }) => {
  const parseBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-blue-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = text.split('\n');
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Headers
        if (trimmed.startsWith('### ')) {
          return <h3 key={i} className="text-base font-black text-slate-900 pt-3 pb-1 border-b border-slate-100 uppercase tracking-tight">{parseBold(trimmed.substring(4))}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-black text-blue-700 pt-4 pb-2">{parseBold(trimmed.substring(3))}</h2>;
        }

        // Bullets
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <p className="flex-1 leading-relaxed text-slate-700">{parseBold(trimmed.substring(2))}</p>
            </div>
          );
        }

        // Regular paragraph
        return <p key={i} className="leading-relaxed text-slate-700">{parseBold(line)}</p>;
      })}
    </div>
  );
};

// Accessible FormField with Tooltip support
const FormField = ({ label, example, value, onChange, placeholder, error, tooltip, isTextArea }: any) => (
  <div className="space-y-1.5 group relative">
    <div className="flex items-center gap-1.5">
      <label className={`text-sm font-bold block transition-colors ${error ? 'text-red-600' : 'text-slate-900'}`}>
        {label}
      </label>
      {tooltip && (
        <div className="relative group/tooltip flex items-center">
          <button 
            type="button"
            className="text-slate-400 hover:text-blue-500 transition-colors focus:outline-none focus:text-blue-600"
            aria-label={`Information about ${label}`}
          >
            <HelpCircle size={14} />
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-800 text-white text-[10px] leading-relaxed rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible pointer-events-none transition-all duration-200 z-50 shadow-2xl border border-slate-700">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
    {isTextArea ? (
      <textarea
        className={`w-full p-3 bg-white border rounded-xl outline-none transition-all text-sm placeholder:text-slate-500 min-h-[100px]
          ${error 
            ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30 text-red-900 focus:ring-red-200 focus:border-red-600' 
            : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
          }`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
      />
    ) : (
      <input
        type="text"
        className={`w-full p-3 bg-white border rounded-xl outline-none transition-all text-sm placeholder:text-slate-500 
          ${error 
            ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30 text-red-900 focus:ring-red-200 focus:border-red-600' 
            : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
          }`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
      />
    )}
    <div className="flex justify-between items-start gap-2">
      <p id={error ? `${label}-error` : undefined} className={`text-[11px] font-medium ${error ? 'text-red-500' : 'text-slate-600'}`}>
        {error ? error : `Example: ${example}`}
      </p>
    </div>
  </div>
);

const TermsContent = () => (
  <div className="space-y-8 font-mono text-[11px] leading-relaxed text-slate-700">
    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">1. Overview of Service</h3>
      <p>
        The Employer Engagement Engine (E^3) is a strategic business intelligence tool designed for community colleges and workforce development entities. E^3 provides automated market discovery, outreach asset generation, and multi-channel campaign planning through the integration of proprietary logic and generative artificial intelligence.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">2. AI Usage & Accuracy</h3>
      <p>
        E^3 leverages Large Language Models (LLMs) to generate predictive analytics, employer ROI pitches, and outreach copy. 
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Users acknowledge that AI-generated content may contain factual inaccuracies, regional labor market hallucinations, or stylistic errors.</li>
        <li>E^3 does not guarantee the existence or current hiring status of any matched employer.</li>
        <li>Final editorial control and verification of all generated assets rest solely with the User.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">3. Compliance & Fair Hiring</h3>
      <p>
        The User is responsible for ensuring that all outreach campaigns, job descriptions, and partnership agreements generated through E^3 comply with local, state, and federal laws, including but not limited to Equal Employment Opportunity (EEO) standards and the Fair Labor Standards Act (FLSA).
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">4. No Guarantee of Outcomes</h3>
      <p>
        Participation in the E^3 engine run does not guarantee specific partnership conversions, employer signups, or student placement outcomes. Success metrics are dependent on individual program viability, market conditions, and User follow-up execution.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">5. Data Sensitivity</h3>
      <p>
        Users are strictly prohibited from inputting sensitive student data, Personally Identifiable Information (PII) of minors, or confidential institutional intellectual property into the E^3 intake fields.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">6. Intellectual Property</h3>
      <p>
        While E^3 generates outreach templates, the final customized campaign assets remain the property of the generating institution. The underlying E^3 logic, branding, and interface design are the exclusive property of E^3 Engine.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">7. GDPR & Geographic Restrictions</h3>
      <p>
        This application is not compliant with the European Union's General Data Protection Regulation (GDPR). Access and use of this service are strictly prohibited for users located within the European Union (EU) or European Economic Area (EEA). By using this service, you certify that you are not a resident of the EU/EEA.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">8. CCPA & State Data Broker Compliance</h3>
      <p>
        E^3 complies with the California Consumer Privacy Act (CCPA) and applicable state-level data broker laws (e.g., Vermont, California).
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Right to Know & Delete:</strong> California residents have the right to request disclosure of personal data collected and to request its deletion.</li>
        <li><strong>Do Not Sell My Info:</strong> E^3 does not sell personal information as defined by the CCPA. Users may opt-out of any future data sharing by contacting support.</li>
        <li><strong>Data Broker Registration:</strong> Where applicable, E^3 adheres to state registration requirements for data brokers.</li>
      </ul>
    </section>
  </div>
);

const EmailPolicyContent = () => (
  <div className="space-y-8 font-mono text-[11px] leading-relaxed text-slate-700">
    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">1. CAN-SPAM Compliance</h3>
      <p>
        E^3 is committed to complying with the Controlling the Assault of Non-Solicited Pornography And Marketing (CAN-SPAM) Act. All commercial emails sent through our platform or generated for your use must adhere to the following requirements:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Don't use false or misleading header information.</strong> Your "From," "To," "Reply-To," and routing information – including the originating domain name and email address – must be accurate and identify the person or business who initiated the message.</li>
        <li><strong>Don't use deceptive subject lines.</strong> The subject line must accurately reflect the content of the message.</li>
        <li><strong>Identify the message as an ad.</strong> You must disclose clearly and conspicuously that your message is an advertisement.</li>
        <li><strong>Tell recipients where you're located.</strong> Your message must include your valid physical postal address.</li>
        <li><strong>Tell recipients how to opt out of receiving future email from you.</strong> Your message must include a clear and conspicuous explanation of how the recipient can opt out of getting email from you in the future.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">2. Opt-Out Mechanism</h3>
      <p>
        We honor opt-out requests promptly. If a recipient chooses to unsubscribe or opt-out:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>We will process the request immediately.</li>
        <li>You must not sell or transfer their email address, even in the form of a mailing list.</li>
        <li>You cannot charge a fee, require the recipient to give you any personally identifying information beyond an email address, or make the recipient take any step other than sending a reply email or visiting a single page on an Internet website as a condition for honoring an opt-out request.</li>
        <li><strong>Future Solicitation Prevention:</strong> You must ensure that companies who unsubscribe or opt-out are not solicited in the future. This can be done by adding the company to the "Exclusions" box on the Intake Form.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">3. Third-Party Sending</h3>
      <p>
        If you hire another company to handle your email marketing, you cannot contract away your legal responsibility to comply with the law. Both the company whose product is promoted in the message and the company that actually sends the message may be held legally responsible.
      </p>
    </section>

    <section className="space-y-4">
      <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">4. CCPA & State Privacy Rights</h3>
      <p>
        In accordance with the California Consumer Privacy Act (CCPA) and other state privacy laws:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Recipients have the right to request that their email address be deleted from your marketing lists.</li>
        <li>You must honor "Do Not Sell" requests if you are subject to CCPA requirements.</li>
        <li>E^3 provides tools (like the Exclusion list) to help you comply with these state-level opt-out and deletion requests.</li>
      </ul>
    </section>
  </div>
);

const TermsModal = ({ isOpen, onAccept }: { isOpen: boolean; onAccept: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        <header className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 shrink-0">
          <Gavel className="text-blue-600" size={24} />
          <div>
            <h2 className="font-black text-slate-900 text-lg">Terms & Conditions Required</h2>
            <p className="text-xs font-bold text-slate-500">Please read and accept to proceed to the Engine.</p>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 bg-white selection:bg-blue-100">
          <TermsContent />
        </div>
        
        <footer className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button 
            onClick={onAccept}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
          >
            I Read & Accept the Terms
          </button>
        </footer>
      </div>
    </div>
  );
};

const EmailPolicyModal = ({ isOpen, onAccept }: { isOpen: boolean; onAccept: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        <header className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 shrink-0">
          <MailIcon className="text-blue-600" size={24} />
          <div>
            <h2 className="font-black text-slate-900 text-lg">Email Policy Required</h2>
            <p className="text-xs font-bold text-slate-500">Please read and accept the email usage policy.</p>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 bg-white selection:bg-blue-100">
          <EmailPolicyContent />
        </div>
        
        <footer className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button 
            onClick={onAccept}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
          >
            I Read & Accept the Email Policy
          </button>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [step, setStep] = useState<Step>('landing');

  useEffect(() => {
    if (user && step === 'auth') {
      setStep('intake');
    }
  }, [user, step]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [profile, setProfile] = useState<WorkforceProfile | null>(null);
  const [matches, setMatches] = useState<EmployerMatch[]>([]);
  const [selectedEmployers, setSelectedEmployers] = useState<Set<string>>(new Set());
  const [outreachData, setOutreachData] = useState<Record<string, OutreachAssets>>({});
  const [linkedinPosts, setLinkedinPosts] = useState<LinkedInPost[]>([]);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [showComplianceSticky, setShowComplianceSticky] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showEmailPolicyModal, setShowEmailPolicyModal] = useState(false);
  
  // Floating Assistant Bot State
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm the E^3 Expert Bot. I can answer questions about the engine, help you find features, or explain how matching works. How can I help you scale your network today?" }
  ]);
  const [botInput, setBotInput] = useState('');
  const [isBotLoading, setIsBotLoading] = useState(false);
  const botEndRef = useRef<HTMLDivElement>(null);

  // High-Fidelity Loading State (Chunk 2 & 3)
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const statusMessages = useMemo(() => [
    "Initializing Strategic Intelligence...",
    "Calibrating Local Labor Market Indices...",
    "Scanning Regional Employer Clusters...",
    "Synthesizing Partnership ROI Signals...",
    "Modeling Industry Alignment Data...",
    "Optimizing Campaign Segmentation...",
    "Generating High-Fidelity Messaging...",
    "Finalizing Performance Report..."
  ], []);

  const systemLogs = useMemo(() => [
    "Connection established with Gemini 3.0...",
    "Analyzing regional employment benchmarks...",
    "Cross-referencing industry skill requirements...",
    "Extracting contact metadata from linked sources...",
    "Applying multi-channel outreach logic...",
    "Generating ROI-focused value propositions...",
    "Validating apprenticeship compliance standards...",
    "Rendering custom partnership visual assets...",
    "Structuring regional growth analytics...",
    "Finalizing employer-facing program report..."
  ], []);

  // Status & Log Rotation Logic
  useEffect(() => {
    let statusInterval: any;
    let logInterval: any;

    if (loading) {
      statusInterval = setInterval(() => {
        setLoadingStatusIndex(prev => (prev + 1) % statusMessages.length);
      }, 3000);

      logInterval = setInterval(() => {
        setActiveLogs(prev => {
          const nextLog = systemLogs[Math.floor(Math.random() * systemLogs.length)];
          const newLogs = [nextLog, ...prev];
          return newLogs.slice(0, 4); // Keep only top 4 logs
        });
      }, 1500);
    } else {
      setLoadingStatusIndex(0);
      setActiveLogs([]);
    }

    return () => {
      clearInterval(statusInterval);
      clearInterval(logInterval);
    };
  }, [loading, statusMessages.length, systemLogs]);
  
  // Reset Confirmation & Feedback State (Chunk 3)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetStep, setResetTargetStep] = useState<Step>('intake');
  const [showResetToast, setShowResetToast] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Support Expert State
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const supportEndRef = useRef<HTMLDivElement>(null);

  // Speech State
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Email Selection State
  const [activeEmailSelector, setActiveEmailSelector] = useState<{ recipient: string, subject: string, body: string } | null>(null);

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeModal, setActiveModal] = useState<{ type: 'followups' | 'script' | 'linkedin'; employer: string } | null>(null);

  const isActuallyExpanded = !isSidebarCollapsed || isSidebarHovered;

  // Implemented filteredMatches used in outreach step
  const filteredMatches = useMemo(() => {
    if (selectedEmployers.size === 0) return matches;
    return matches.filter(m => selectedEmployers.has(m.name));
  }, [matches, selectedEmployers]);

  const currentEmployer = useMemo(() => {
    if (!activeModal) return null;
    return matches.find(m => m.name === activeModal.employer);
  }, [activeModal, matches]);

  const progress = useMemo(() => {
    if (step === 'landing') return 0;
    
    const linearSteps: Step[] = ['intake', 'discovery', 'report', 'outreach', 'linkedin', 'dashboard'];
    const index = linearSteps.indexOf(step);
    if (index === -1) return 100;
    
    return ((index + 1) / linearSteps.length) * 100;
  }, [step]);

  // Dashboard Stats Memo
  const dashboardStats = useMemo(() => {
    const totalMatches = matches.length;
    const highAlignment = matches.filter(m => m.score >= 85).length;
    const campaignsBuilt = Object.keys(outreachData).length;
    const avgScore = totalMatches > 0 ? Math.round(matches.reduce((acc, curr) => acc + curr.score, 0) / totalMatches) : 0;
    const socialReady = linkedinPosts.length;
    
    // Segment breakdown
    const segments: Record<string, number> = {};
    matches.forEach(m => {
      segments[m.segment] = (segments[m.segment] || 0) + 1;
    });

    return { totalMatches, highAlignment, campaignsBuilt, avgScore, socialReady, segments };
  }, [matches, outreachData, linkedinPosts]);

  // Derive suggested hashtags based on profile industries
  const suggestedHashtagsBank = useMemo(() => {
    if (!profile) return ['Workforce', 'WorkforceDevelopment', 'LocalHiring', 'FutureOfWork'];
    const base = ['Workforce', 'WorkforceDevelopment', 'LocalHiring', 'FutureOfWork', 'SkillsGap', 'CommunityImpact', 'TalentPipeline'];
    const industryTags = profile.industries.map(i => i.replace(/\s+/g, ''));
    return [...new Set([...base, ...industryTags])];
  }, [profile]);

  // Handle auto-scrolling chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages]);

  useEffect(() => {
    botEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [botMessages, isBotOpen]);

  // Reset main scroll position when switching steps
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [step]);

  // Handle auto-scrolling when docs step is active
  useEffect(() => {
    if ((step === 'docs' || step === 'terms') && pendingScrollId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(pendingScrollId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setPendingScrollId(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, pendingScrollId]);

  // Show Terms Modal on Intake Step
  useEffect(() => {
    if (step === 'intake') {
      if (!form.termsAccepted) {
        setShowTermsModal(true);
      } else if (!form.emailPolicyAccepted) {
        setShowEmailPolicyModal(true);
      }
    }
  }, [step, form.termsAccepted, form.emailPolicyAccepted]);

  // Toast lifecycle (Chunk 3)
  useEffect(() => {
    if (showResetToast) {
      const timer = setTimeout(() => setShowResetToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showResetToast]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const stopSpeech = () => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch(e) {}
      currentSourceRef.current = null;
    }
    setSpeakingText(null);
    setIsLoadingSpeech(false);
  };

  const handleResetEngine = (targetStep: Step = 'intake') => {
    setResetTargetStep(targetStep);
    setIsResetModalOpen(true);
  };

  /**
   * Chunk 2 & 3: Atomic Reset Engine with UX Feedback
   * Clears all state slices in a single synchronous block and triggers feedback.
   */
  const performResetEngine = () => {
    // 1. Reset Core Form State
    setForm({ ...INITIAL_FORM_STATE });
    setErrors({});
    
    // 2. Reset Domain Data
    setProfile(null);
    setMatches([]);
    setSelectedEmployers(new Set());
    setOutreachData({});
    setLinkedinPosts([]);
    
    // 3. Reset UI Interaction State
    setChatMessages([]);
    setSupportMessages([]);
    setChatInput('');
    setSupportInput('');
    setIsChatLoading(false);
    setIsSupportLoading(false);
    setActiveModal(null);
    setGeneratingImages({});
    setLoading(false);
    
    // 4. Reset Side Effects
    stopSpeech();
    
    // 5. Navigate & Feedback (Chunk 3)
    setStep(resetTargetStep);
    setIsResetModalOpen(false);
    setShowResetToast(true);

    // 6. Force-reset Scroll position explicitly
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  const handleAcceptTerms = () => {
    updateField('termsAccepted', true);
    setShowTermsModal(false);
    // Email policy modal will be triggered by the useEffect
  };

  const handleAcceptEmailPolicy = () => {
    updateField('emailPolicyAccepted', true);
    setShowEmailPolicyModal(false);
  };

  const navigateToDocSection = (sectionId: string) => {
    setPendingScrollId(sectionId);
    setStep('docs');
  };

  const handleReadAloud = async (text: string) => {
    if (speakingText === text) {
      stopSpeech();
      return;
    }
    
    stopSpeech();
    setIsLoadingSpeech(true);
    setSpeakingText(text);

    try {
      const base64Audio = await generateSpeech(text);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (currentSourceRef.current === source) {
          setSpeakingText(null);
          currentSourceRef.current = null;
        }
      };
      source.start(0);
      currentSourceRef.current = source;
      setIsLoadingSpeech(false);
    } catch (error) {
      console.error("Speech error:", error);
      alert("Failed to read aloud. Please check your connection.");
      stopSpeech();
    }
  };

  const handleEmailExport = (recipient: string, subject: string, body: string) => {
    setActiveEmailSelector({ recipient, subject, body });
  };

  const triggerEmailProvider = (provider: 'default' | 'gmail' | 'outlook' | 'yahoo') => {
    if (!activeEmailSelector) return;
    const { recipient, subject, body } = activeEmailSelector;
    let url = '';
    
    const encodedTo = encodeURIComponent(recipient);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    switch (provider) {
      case 'gmail':
        url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
        break;
      case 'outlook':
        url = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
        break;
      case 'yahoo':
        url = `https://compose.mail.yahoo.com/?to=${encodedTo}&subj=${encodedSubject}&body=${encodedBody}`;
        break;
      default:
        url = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
        break;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
    setActiveEmailSelector(null);
  };

  const handleDownloadImage = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `E3_${fileName.replace(/\s+/g, '_').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async (dataUrl: string, title: string) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'workforce-graphic.png', { type: 'image/png' });

      // Check for Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Workforce Opportunity: ${title}`,
          text: 'Building a stronger workforce together. Check out our new workforce partnership opportunities!',
        });
      } else {
        // Fallback: Try to copy to clipboard for manual paste sharing
        try {
          const data = [new ClipboardItem({ 'image/png': blob })];
          await navigator.clipboard.write(data);
          alert("Sharing not natively supported in this browser, but we've COPIED the image to your clipboard! You can now paste it directly into your LinkedIn feed.");
        } catch (copyErr) {
          alert("Sharing not supported. Please use the Download button to save the graphic for your post.");
        }
      }
    } catch (err) {
      console.error('Share error:', err);
      alert("Could not share graphic. Please try downloading it instead.");
    }
  };

  const handleCopyAllLinkedInPosts = () => {
    if (linkedinPosts.length === 0) return;
    const allText = linkedinPosts.map((p, i) => `[POST ${i+1} - ${p.pillar}]\n${p.content}\n${p.hashtags.map(h => `#${h}`).join(' ')}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(allText);
    alert("All generated LinkedIn posts copied to clipboard!");
  };

  const handleUpdatePost = (index: number, updates: Partial<LinkedInPost>) => {
    setLinkedinPosts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      return next;
    });
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleProcessIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.title) newErrors.title = "Title is required";
    if (!form.region) newErrors.region = "Region is required";
    if (!form.industries) newErrors.industries = "Industries are required";
    if (!form.contactName) newErrors.contactName = "Contact Name is required";
    if (!form.contactAddress) newErrors.contactAddress = "Contact Address is required";
    if (!form.contactEmail) newErrors.contactEmail = "Contact Email is required";
    if (!form.contactPhone) newErrors.contactPhone = "Contact Phone is required";
    if (!form.termsAccepted) newErrors.termsAccepted = "You must accept the terms";
    if (!form.emailPolicyAccepted) newErrors.emailPolicyAccepted = "You must accept the email policy";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // GDPR / EU Check
    const isEU = EU_COUNTRIES.some(country => 
      form.contactAddress.toLowerCase().includes(country.toLowerCase())
    );

    if (isEU) {
      alert("Access Denied: This application is not available for use in the European Union due to GDPR compliance restrictions.");
      return;
    }

    setLoading(true);
    try {
      const enhanced = await enhanceProfile({
        title: form.title,
        region: form.region,
        industries: form.industries.split(',').map(i => i.trim()),
        ctaLink: form.programLink,
        primaryContactInfo: {
          name: form.contactName,
          email: form.contactEmail,
          phone: form.contactPhone,
          address: form.contactAddress
        }
      });
      // Merge user-provided lists into the enhanced profile
      setProfile({
        ...enhanced,
        primaryContactInfo: {
          name: form.contactName,
          email: form.contactEmail,
          phone: form.contactPhone,
          address: form.contactAddress
        },
        currentPartners: form.currentPartners.split(',').map((s: string) => s.trim()).filter((s: string) => s),
        pastPartners: form.pastPartners.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      });
      setStep('discovery');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#4f46e5', '#0ea5e9']
      });
    } catch (err) {
      console.error(err);
      alert("Failed to enhance profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Implement handleRunDiscovery for finding employers
  const handleRunDiscovery = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const results = await discoverEmployers(profile);
      setMatches(results);
      setStep('report');
    } catch (err) {
      console.error(err);
      alert("Discovery failed.");
    } finally {
      setLoading(false);
    }
  };

  // Implement handleGenerateOutreach for creating campaign assets
  const handleGenerateOutreach = async (employer: EmployerMatch) => {
    if (!profile) return;
    setLoading(true);
    try {
      const assets = await generateOutreach(profile, employer);
      setOutreachData(prev => ({ ...prev, [employer.name]: assets }));
    } catch (err) {
      console.error(err);
      alert("Failed to generate outreach.");
    } finally {
      setLoading(false);
    }
  };

  // Implement handleCopyAllOutreach for copying campaign data
  const handleCopyAllOutreach = () => {
    const texts = filteredMatches
      .filter(m => outreachData[m.name])
      .map(m => {
        const d = outreachData[m.name];
        return `EMPLOYER: ${m.name}\nSEGMENT: ${m.segment}\n\nPRIMARY EMAIL:\n${d.primaryEmail}\n\nFOLLOW UPS:\n${d.followUps.join('\n\n')}\n\nCALL SCRIPT:\n${d.callScript.join('\n')}\n\nLINKEDIN MESSAGE:\n${d.linkedInMessage}`;
      })
      .join('\n\n' + '='.repeat(30) + '\n\n');
    
    if (texts) {
      copyToClipboard(texts);
      alert("Copied all generated outreach assets to clipboard!");
    } else {
      alert("No outreach assets generated yet.");
    }
  };
  
  const downloadMatchReport = () => {
    if (matches.length === 0) return;
    const headers = ["Employer", "NAICS", "Size", "Score", "Segment", "Website", "Phone", "Email", "Rationale"];
    const rows = matches.map(m => [
      `"${m.name.replace(/"/g, '""')}"`, // escape quotes
      `"${(m.naicsCode || 'N/A')}"`,
      `"${(m.employeeCount || 'N/A').replace(/"/g, '""')}"`,
      m.score,
      `"${m.segment}"`,
      `"${m.website || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.contactEmail || ''}"`,
      `"${m.rationale.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `E3_Match_Report_${profile?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Implement ActionButtons component used in outreach and linkedin views
  const ActionButtons = ({ text, label, onEmail }: { text: string; label: string; onEmail?: () => void }) => (
    <div className="flex items-center gap-2">
      {onEmail && (
        <button
          onClick={onEmail}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-blue-600"
          title={`Send via Email`}
        >
          <Send size={14} />
        </button>
      )}
      <button
        onClick={() => copyToClipboard(text)}
        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
        title={`Copy ${label}`}
      >
        <Copy size={14} />
      </button>
      <button
        onClick={() => handleReadAloud(text)}
        className={`p-1.5 rounded-lg transition-colors ${speakingText === text ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 text-slate-500'}`}
        disabled={isLoadingSpeech}
        title={`Read ${label} Aloud`}
      >
        {isLoadingSpeech && speakingText === text ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
      </button>
    </div>
  );

  // Implement handleGenerateLinkedin for post generation
  const handleGenerateLinkedin = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const posts = await generateLinkedInCalendar(profile);
      setLinkedinPosts(posts);
    } catch (err) {
      console.error(err);
      alert("Failed to generate LinkedIn strategy.");
    } finally {
      setLoading(false);
    }
  };

  // Implement handleGenerateGraphic for individual post graphics
  const handleGenerateGraphic = async (index: number) => {
    if (!profile || !linkedinPosts[index]) return;
    setGeneratingImages(prev => ({ ...prev, [index]: true }));
    try {
      const url = await generatePostGraphic(linkedinPosts[index], profile);
      const newPosts = [...linkedinPosts];
      newPosts[index] = { ...newPosts[index], imageUrl: url };
      setLinkedinPosts(newPosts);
    } catch (err) {
      console.error(err);
      alert("Graphic generation failed.");
    } finally {
      setGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  // Implement handleSendChat for the AEGE Assistant
  const handleSendChat = async (overrideMsg?: string) => {
    const userMsg = overrideMsg !== undefined ? overrideMsg : chatInput;
    if (!userMsg.trim() || isChatLoading) return;
    
    if (overrideMsg === undefined) setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `You are the E^3 Strategy Assistant, acting as a high-end Talent Scout and Strategic Partnership Manager. 
          
          Current User Query: "${userMsg}"
          
          Instructions:
          1. Use Google Search to find REAL, ACTIVE job listings or workforce programs related to the query.
          2. LEAD INTELLIGENCE: For every lead found, attempt to identify a **Warm Lead Entry Point**. Search specifically for Recruitment Managers, Talent Acquisition Leads, or Department Directors at that company in that region.
          3. Structure your response with Bold Headers (###) for each employer.
          4. Use Bullet Points (* ) for:
             - **Active Program/Role:** Details about the current hiring or workforce initiative.
             - **Strategic Opportunity:** Why this is a valuable lead for a workforce development partner.
             - **Warm Lead Entry Point:** List a specific name and title found via search. 
               * *Fallback Logic:* If no name is found, provide the precise LinkedIn search query for the most likely decision-maker (e.g., "Search for: 'Director of HR at [Company Name]'").
          5. AFTER providing results, act as a strategist. Ask a single leading question to move them toward Step 1 (Intake) or Step 4 (Campaign).
          
          Keep your tone professional, encouraging, and highly conversational. Format your response as a JSON object with a single "reply" field containing markdown-formatted text.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING }
            },
            required: ['reply']
          }
        }
      });

      const data = JSON.parse(response.text);
      
      // Extract grounding sources
      let sources: { title: string; uri: string }[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.candidates[0].groundingMetadata.groundingChunks
          .map((chunk: any) => chunk.web)
          .filter((web: any) => web && web.uri && web.title)
          .map((web: any) => ({ title: web.title, uri: web.uri }));
          
        sources = sources.filter((s, index, self) => 
          index === self.findIndex((t) => (t.uri === s.uri))
        );
      }

      setChatMessages(prev => [...prev, { role: 'model', text: data.reply, sources }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm having a brief connection issue while scanning the job market. Let's try that again in a second!" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Support Expert Interaction Logic (Floating Assistant & Page Expert)
  const handleSendSupport = async (overrideMsg?: string, source: 'page' | 'floating' = 'page') => {
    const userMsg = overrideMsg !== undefined ? overrideMsg : (source === 'page' ? supportInput : botInput);
    if (!userMsg.trim()) return;

    if (source === 'page') {
      if (isSupportLoading) return;
      if (overrideMsg === undefined) setSupportInput('');
      const history = supportMessages.map(m => ({ role: m.role as 'user' | 'model', text: m.text }));
      setSupportMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsSupportLoading(true);
      try {
        const response = await getSupportExpertResponse(userMsg, history);
        const text = response.text || "I'm looking into that for you.";
        
        // Tool handling for navigation
        if (response.functionCalls && response.functionCalls.length > 0) {
          const fc = response.functionCalls[0];
          if (fc.name === 'navigateApp') {
            const targetStep = fc.args.step as Step;
            setStep(targetStep);
            setSupportMessages(prev => [...prev, { role: 'model', text: `${text}\n\n*System Action: Navigating to ${targetStep}...*` }]);
          }
        } else {
          setSupportMessages(prev => [...prev, { role: 'model', text: text }]);
        }
      } catch (err) {
        console.error(err);
        setSupportMessages(prev => [...prev, { role: 'model', text: "System connection error. Please try again." }]);
      } finally {
        setIsSupportLoading(false);
      }
    } else {
      if (isBotLoading) return;
      if (overrideMsg === undefined) setBotInput('');
      const history = botMessages.map(m => ({ role: m.role as 'user' | 'model', text: m.text }));
      setBotMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsBotLoading(true);
      try {
        /* Fixed: userMessage changed to userMsg */
        const response = await getSupportExpertResponse(userMsg, history);
        const text = response.text || "I'm processing your request.";
        
        if (response.functionCalls && response.functionCalls.length > 0) {
          const fc = response.functionCalls[0];
          if (fc.name === 'navigateApp') {
            const targetStep = fc.args.step as Step;
            setStep(targetStep);
            setBotMessages(prev => [...prev, { role: 'model', text: `${text}\n\n*Action: Jumping to ${targetStep}...*` }]);
          }
        } else {
          setBotMessages(prev => [...prev, { role: 'model', text: text }]);
        }
      } catch (err) {
        console.error(err);
        setBotMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the expert manual." }]);
      } finally {
        setIsBotLoading(false);
      }
    }
  };

  const toggleEmployerSelection = (name: string) => {
    const newSet = new Set(selectedEmployers);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedEmployers(newSet);
  };

  /**
   * Helper to determine the logical "next" or "current" engine step
   * for the Mobile "Engine" navigation button.
   */
  const getWorkflowTarget = (): Step => {
    if (!profile) return 'intake';
    if (matches.length === 0) return 'discovery';
    // Narrowed Step array for comparison
    return (['chat', 'docs', 'terms', 'support'] as Step[]).includes(step) ? 'report' : step;
  };

  // Determine which nav node is "active" for styling
  const isWorkflowActive = ['intake', 'discovery', 'report', 'outreach', 'linkedin', 'dashboard'].includes(step);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {step !== 'landing' && step !== 'terms' && step !== 'docs' && step !== 'auth' && (
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`hidden lg:flex ${isActuallyExpanded ? 'w-64' : 'w-20'} bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out animate-in slide-in-from-left duration-500 relative border-r border-slate-800 group/sidebar`}
        >
          {/* Vertical Center Toggle Handle */}
          <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute top-1/2 -right-3 -translate-y-1/2 z-[70] w-6 h-12 bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-110 active:scale-95"
            title={isActuallyExpanded ? "Pin / Collapse Sidebar" : "Pin / Expand Sidebar"}
          >
            {isActuallyExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <div className={`p-6 border-b border-slate-800 flex ${!isActuallyExpanded ? 'flex-col items-center gap-4' : 'items-center justify-between'}`}>
            <div className={`flex items-center gap-2 transition-all duration-300 ${!isActuallyExpanded ? 'opacity-0 w-0 h-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
              <Target className="text-blue-400 shrink-0" size={24} />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight whitespace-nowrap leading-none">E^3 Engine</h1>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">A product of EdgefactoryAI</p>
              </div>
            </div>
            {!isActuallyExpanded && <Target className="text-blue-400" size={32} />}
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
            {[
              { id: 'landing', icon: Layout, label: 'Overview' },
              { id: 'intake', icon: FileText, label: '1. Job Intake' },
              { id: 'discovery', icon: Search, label: '2. Employer Discovery', requiresProfile: true },
              { id: 'report', icon: BarChart2, label: '3. Match Report', requiresProfile: true },
              { id: 'outreach', icon: Mail, label: '4. Campaign Builder', requiresProfile: true },
              { id: 'linkedin', icon: Linkedin, label: '5. LinkedIn Engine', requiresProfile: true },
              { id: 'dashboard', icon: PieChart, label: 'Analytics Hub', requiresProfile: true },
              { id: 'chat', icon: MessageSquare, label: 'E^3 Job Search', highlight: true },
              { id: 'support', icon: LifeBuoy, label: 'Support Expert', highlight: true },
              { id: 'docs', icon: BookOpen, label: 'White Papers' },
            ].filter(item => !item.requiresProfile || profile).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStep(item.id as Step);
                  stopSpeech();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all outline-none focus:ring-2 focus:ring-blue-500 group ${
                  step === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${item.highlight && step !== item.id ? 'border-l-2 border-blue-500' : ''} ${!isActuallyExpanded ? 'justify-center' : ''}`}
                title={!isActuallyExpanded ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                <span className={`font-medium whitespace-nowrap transition-all duration-300 origin-left ${!isActuallyExpanded ? 'opacity-0 w-0 scale-0 pointer-events-none' : 'opacity-100 w-auto scale-100'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
          
          <div className={`p-4 border-t border-slate-800 transition-all duration-300 ${!isActuallyExpanded ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Session</p>
               <div className="space-y-2">
                 <button 
                  type="button"
                  onClick={() => handleResetEngine('landing')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors group"
                 >
                   <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                   New Project Run
                 </button>
               </div>
               <div className="pt-2">
                 <p className="text-[10px] font-semibold text-slate-400">Powered by Gemini 3.0</p>
                 <p className="text-[10px] font-semibold text-blue-400">Employer Engagement Engine</p>
               </div>
            </div>
          </div>
        </aside>
      )}

      <main ref={mainRef} className={`flex-1 relative flex flex-col bg-slate-50 h-[100dvh] lg:h-screen overscroll-behavior-y-contain no-scrollbar ${['chat', 'terms', 'docs', 'support'].includes(step) ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {step !== 'landing' && step !== 'terms' && step !== 'docs' && (
          <div className="sticky top-0 z-[60] w-full bg-white/80 backdrop-blur-sm border-b border-slate-200 shrink-0">
            <div className="w-full h-[3px] bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-700 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="px-4 md:px-8 py-1.5 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {step === 'chat' ? 'Assisted Strategy' : step === 'support' ? 'System Expert' : 'Workflow Progress'}
              </span>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                {Math.round(progress)}% Complete
              </span>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[1000] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 overflow-hidden">
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1001] bg-[length:100%_4px,3px_100%]" />
            
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/30 overflow-hidden">
               <div className="w-full h-full bg-blue-400 animate-infinite-slide" />
            </div>
            
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping duration-[3000ms]" />
              <div className="relative w-28 h-28 bg-blue-600 rounded-[2.5rem] shadow-[0_0_50px_-10px_rgba(37,99,235,0.6)] flex items-center justify-center transform transition-all">
                <Target className="text-white animate-pulse" size={48} />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                   <Sparkles className="text-blue-600" size={20} />
                </div>
              </div>
            </div>

            <div className="space-y-6 max-w-sm w-full relative z-[1002]">
              <div className="space-y-1">
                <h3 className="text-white font-black text-2xl md:text-3xl tracking-tighter">E^3 Intelligence Active</h3>
                <p className="text-blue-400/80 text-[10px] font-black uppercase tracking-[0.3em]">Please Wait...search can take up to 4 minutes</p>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-[1.5rem] p-5 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-white text-[11px] md:text-xs font-black uppercase tracking-widest transition-all duration-700" key={loadingStatusIndex}>
                    {statusMessages[loadingStatusIndex]}
                  </span>
                </div>
                
                {/* Simulated Terminal Log */}
                <div className="space-y-2 text-left font-mono h-24 overflow-hidden mask-fade-bottom">
                  {activeLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 text-[9px] md:text-[10px] animate-in slide-in-from-top-1 duration-500">
                      <span className="text-blue-500/60 shrink-0">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                      <span className={`${idx === 0 ? 'text-blue-300' : 'text-slate-500'}`}>
                        {idx === 0 ? '> ' : '  '}{log}
                      </span>
                    </div>
                  ))}
                  {activeLogs.length === 0 && (
                    <div className="text-slate-600 text-[10px] italic">Warming system components...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Politely ergonomic Kill Switch */}
            <div className="fixed bottom-12 left-0 right-0 z-[1003] px-6">
               <button 
                type="button"
                onClick={() => setLoading(false)}
                className="group flex items-center justify-center gap-3 mx-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all duration-500 active:scale-95 outline-none backdrop-blur-md"
               >
                 <Power size={16} className="text-slate-500 group-hover:text-red-500 transition-colors" />
                 <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white leading-none mb-0.5">Safely Interrupt</p>
                   <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Return to Engine Controller</p>
                 </div>
               </button>
            </div>

            <style>{`
              @keyframes infinite-slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              .animate-infinite-slide {
                animation: infinite-slide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite;
              }
              .mask-fade-bottom {
                mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
              }
            `}</style>
          </div>
        )}

        {step === 'contact' && (
          <div className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-50 animate-in fade-in duration-500">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden text-center p-10 space-y-8">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
                <MailIcon size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Get in Touch</h2>
                <p className="text-slate-500 font-medium text-sm">We'd love to hear from you. Reach out to our team directly.</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Us At</p>
                <a href="mailto:sales@edgefactoryai.com" className="text-xl font-black text-blue-600 hover:text-blue-700 transition-colors block break-all">
                  sales@edgefactoryai.com
                </a>
              </div>

              <button 
                onClick={() => setStep('landing')}
                className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft size={14} /> Back to Overview
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && (
          <LoginPage onBack={() => setStep('landing')} onContact={() => setStep('contact')} />
        )}

        {step === 'landing' && (
          <div className="min-h-full flex flex-col">
            <header className="sticky top-0 z-[70] w-full px-8 py-4 flex justify-between items-center transition-all bg-slate-900/60 backdrop-blur-xl border-b border-white/5">
              <div className="flex items-center gap-2">
                <Target className="text-blue-400" size={32} />
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter text-white leading-none">E^3<span className="text-blue-500">.</span></span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">A product of EdgefactoryAI</span>
                </div>
              </div>
              
                 {/* Politely ergonomic Kill Switch 
              <div className="hidden md:flex items-center gap-8 text-slate-400 font-bold text-sm">
                <button onClick={() => navigateToDocSection('docs-process')} className="hover:text-white transition-colors">Documentation</button>
                <button onClick={() => navigateToDocSection('docs-impact')} className="hover:text-white transition-colors">ROI Impact</button>
                <button onClick={() => navigateToDocSection('docs-compliance')} className="hover:text-white transition-colors">Compliance</button>
              </div>
              */}
              
              <div className="flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 text-sm font-medium hidden md:block">{user.email}</span>
                    <button 
                      type="button"
                      onClick={async () => {
                        await logout();
                        setStep('landing');
                      }}
                      className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
                    >
                      Sign Out
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStep('intake')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setStep('auth')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </header>

            <section className="bg-slate-900 text-white py-20 md:py-32 lg:py-40 px-6 md:px-12 relative overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-indigo-600/10 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none"></div>
              
              <div className="max-w-6xl mx-auto relative z-10 text-center space-y-10 md:space-y-14">
                <div className="inline-flex items-center gap-2 bg-blue-600/15 text-blue-400 px-5 py-2.5 rounded-full text-xs font-black border border-blue-600/20 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Zap size={14} className="fill-current" />
                  <span>The Workforce Intelligence Engine</span>
                </div>
                
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 flex flex-col gap-2">
                  <span className="block">Scale Your</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 pb-4">Employer Network.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                  Employer Engagement Engine (E³), helping Workforce Programs Find, Engage, and Grow Employer Partners. A product of EdgeFactory AI.
                </p>
                
                <div className="max-w-2xl mx-auto w-full pt-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300 flex justify-center">
                   {/* Initialize Engine button removed */}
                </div>
                
                <div className="pt-8 animate-bounce opacity-50">
                  <ChevronDown className="mx-auto text-slate-400" size={40} />
                </div>
              </div>
            </section>
            
            <section id="process" className="py-32 px-8 bg-white relative">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">The 5-Step Partnership Lifecycle</h2>
                  <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Automating the most critical segments of the employer engagement funnel.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                  <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-slate-200 -z-0"></div>

                  {[
                    { icon: FileText, title: 'Intake', desc: 'Define your program skills and ROI.', color: 'blue' },
                    { icon: Search, title: 'Discovery', desc: 'AI scans local markets for employer matches.', color: 'indigo' },
                    { icon: BarChart2, title: 'Analysis', desc: 'Rank matches by alignment and hiring signals.', color: 'violet' },
                    { icon: Mail, title: 'Outreach', desc: 'Generate multi-touch campaign assets.', color: 'blue' },
                    { icon: Linkedin, title: 'Visibility', desc: 'Scale LinkedIn content for local impact.', color: 'sky' },
                  ].map((s, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center text-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group">
                      <div className={`w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-blue-200 group-hover:rotate-12 transition-transform`}>
                        <s.icon size={32} />
                      </div>
                      <div className="absolute top-6 right-8 text-slate-200 font-black text-5xl opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {i+1}
                      </div>
                      <h3 className="font-black text-xl text-slate-900 mb-2">{s.title}</h3>
                      <p className="text-sm text-slate-500 font-bold leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="pricing" className="py-24 px-8 bg-slate-50 relative border-t border-slate-200">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">See it in Action</h2>
                  <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">The complete workforce intelligence engine for your organization. Schedule a short demo or learn how your organization can access the platform.</p>
                </div>

                <div className="flex justify-center max-w-4xl mx-auto">
                  <div 
                    className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-blue-900/20 select-all"
                  >
                    sales@edgefactoryai.com
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-auto py-16 px-8 border-t border-slate-100 bg-slate-50">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                <div className="flex items-center gap-3">
                   <Target className="text-blue-600" size={32} />
                   <div className="flex flex-col">
                     <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">E^3<span className="text-blue-500">.</span></span>
                     <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">A product of EdgefactoryAI</span>
                   </div>
                </div>
                <div className="flex flex-wrap justify-center gap-10 text-sm font-black text-slate-500 uppercase tracking-widest">
                  <button onClick={() => navigateToDocSection('docs-process')} className="hover:text-blue-600 transition-colors">Documentation</button>
                  <button onClick={() => setStep('terms')} className="hover:text-blue-600 transition-colors">Terms</button>
                  <button onClick={() => setStep('privacy')} className="hover:text-blue-600 transition-colors">Privacy</button>
                  <button onClick={() => setStep('email-policy')} className="hover:text-blue-600 transition-colors">Email Policy</button>
                </div>
                <p className="text-xs font-bold text-slate-400">© 2025 E^3 Engine. Specialized Workforce Intelligence.</p>
              </div>
            </footer>
          </div>
        )}
        
        <div 
          className={`w-full max-w-6xl mx-auto ${['landing'].includes(step) ? 'hidden' : 'flex-1 flex flex-col min-h-0'} ${!['chat', 'terms', 'docs', 'support', 'privacy', 'email-policy'].includes(step) ? 'pb-44 md:pb-24 px-4 md:px-8 pt-4 md:pt-8' : 'pb-0 overflow-hidden'}`}
          style={!['chat', 'terms', 'docs', 'support', 'privacy', 'email-policy'].includes(step) ? { paddingBottom: 'calc(12rem + env(safe-area-inset-bottom))' } : {}}
        >
          {step === 'dashboard' && profile && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <PieChart className="text-blue-600" size={32} />
                    Project Analytics Hub
                  </h2>
                  <p className="text-slate-500 font-bold mt-1">Real-time performance metrics for <span className="text-blue-600">"{profile.title}"</span></p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setStep('intake')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-2xl font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all outline-none">
                    <Edit2 size={18} /> Edit Program
                  </button>
                  <button onClick={() => setStep('report')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all hover:scale-105 active:scale-95 outline-none">
                    <BarChart2 size={18} /> View All Matches
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Market Reach', value: dashboardStats.totalMatches, target: '100', icon: Target, color: 'blue', desc: 'Identified employers' },
                  { label: 'Avg Alignment', value: `${dashboardStats.avgScore}%`, icon: Zap, color: 'emerald', desc: 'Matching accuracy' },
                  { label: 'Campaigns Ready', value: dashboardStats.campaignsBuilt, icon: Mail, color: 'indigo', desc: 'Outreach packages' },
                  { label: 'Social Assets', value: dashboardStats.socialReady, icon: Share2, color: 'sky', desc: 'LinkedIn templates' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:border-blue-400 transition-all">
                    <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <h4 className="text-3xl font-black text-slate-900">{stat.value}</h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{stat.desc}</p>
                    </div>
                    {stat.target && (
                       <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                          className={`h-full bg-${stat.color}-600 transition-all duration-1000`} 
                          style={{ width: `${(Number(stat.value) / Number(stat.target)) * 100}%` }}
                         />
                       </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                   <div className="flex justify-between items-center">
                     <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2">
                       <ActivityIcon size={20} className="text-blue-600" />
                       Strategic Opportunity Breakdown
                     </h3>
                     <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Dynamic Ranking</span>
                   </div>

                   <div className="space-y-6">
                     {Object.entries(dashboardStats.segments).map(([segment, count], i) => (
                       <div key={i} className="space-y-2">
                         <div className="flex justify-between items-end">
                           <span className="text-sm font-bold text-slate-700">{segment}</span>
                           <span className="text-xs font-black text-slate-900">{count} Target Matches</span>
                         </div>
                         <div className="w-full h-3 bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                           <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 delay-300"
                            style={{ width: `${(count / dashboardStats.totalMatches) * 100}%` }}
                           />
                         </div>
                       </div>
                     ))}
                   </div>

                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                     <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                       <Trophy size={32} />
                     </div>
                     <div>
                       <p className="font-black text-slate-900">Highest Concentration: {Object.entries(dashboardStats.segments).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Analyzing...'}</p>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">E^3 has prioritized these segments as they show the strongest correlation between program skills and current hiring market demand.</p>
                     </div>
                   </div>
                </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col gap-6">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
                <Sparkles size={120} />
    </div>
    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Workflow Maturity</h3>
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-500" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * progress) / 100} strokeLinecap="round" />
        </svg>
        <span className="absolute font-black text-xl">{Math.round(progress)}%</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold leading-snug">
          {progress < 40 ? 'Engine Initialized' : progress < 80 ? 'Market Calibrated' : 'Execution Optimized'}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">
          Step {Math.max(1, Math.min(Math.ceil(progress * 6 / 100), 6))} of 6 completed
        </p>
      </div>
    </div>
  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Growth Forecast</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Users size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">Estimated Leads</p>
                          <p className="text-lg font-black text-blue-600">~{(dashboardStats.totalMatches as number) * 2.5}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">ROI Potential</p>
                          <p className="text-lg font-black text-indigo-600">High Impact</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setStep('report')}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 mt-4"
                    >
                      Accelerate Run
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'intake' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-8 border-b border-slate-100 pb-6 gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Step 1: Workforce Program</h2>
                    <p className="text-sm md:text-base text-slate-600 font-medium">Enter details below to generate an employer-facing profile.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleResetEngine('intake')} 
                    className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all font-bold text-[10px] md:text-xs"
                  >
                    <Trash2 size={16} /> Reset Form
                  </button>
                </div>
                <form onSubmit={handleProcessIntake} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 md:gap-y-8">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <FormField 
                        label="Workforce Title/ONET Code" 
                        example="Advanced Manufacturing Technician" 
                        value={form.title} 
                        onChange={(v: string) => updateField('title', v)} 
                        error={errors.title} 
                        tooltip="Enter the official program name or specific ONET SOC code (e.g., 15-1252.00). This helps E^3 identify precise labor market data and job roles."
                      />
                    </div>
                    <FormField 
                      label="Region / Service Area" 
                      example="Greater Atlanta Area" 
                      value={form.region} 
                      onChange={(v: string) => updateField('region', v)} 
                      error={errors.region} 
                      tooltip="Specify the city, county, or regional area this program serves. E^3 uses this to find local employer data."
                    />
                    <FormField 
                      label="Primary Industries" 
                      example="Aerospace, Automotive" 
                      value={form.industries} 
                      onChange={(v: string) => updateField('industries', v)} 
                      error={errors.industries} 
                      tooltip="List the key industry sectors (e.g., Healthcare, IT, Manufacturing). Separate multiple industries with commas."
                    />
                    <FormField 
                      label="Program Page Link (Optional)" 
                      example="https://college.edu/apprenticeship" 
                      value={form.programLink} 
                      onChange={(v: string) => updateField('programLink', v)} 
                      error={errors.programLink} 
                      tooltip="Provide a link to your current program website. E^3 will scan it to extract additional details automatically."
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Contact className="text-blue-600" size={20} />
                      Primary Contact Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField 
                        label="Contact Name" 
                        example="Dr. Sarah Johnson" 
                        value={form.contactName} 
                        onChange={(v: string) => updateField('contactName', v)} 
                        error={errors.contactName}
                        tooltip="The primary person employers or E^3 should reach out to regarding this program."
                      />
                      <FormField 
                        label="Contact Address" 
                        example="123 College Way, Building B, Atlanta, GA 30303" 
                        value={form.contactAddress} 
                        onChange={(v: string) => updateField('contactAddress', v)} 
                        error={errors.contactAddress}
                        tooltip="The physical mailing address for the program office. Required for CAN-SPAM compliance."
                      />
                      <FormField 
                        label="Contact Email" 
                        example="s.johnson@college.edu" 
                        value={form.contactEmail} 
                        onChange={(v: string) => updateField('contactEmail', v)} 
                        error={errors.contactEmail} 
                        tooltip="The professional email address for partnership inquiries."
                      />
                      <FormField 
                        label="Contact Phone" 
                        example="(555) 123-4567" 
                        value={form.contactPhone} 
                        onChange={(v: string) => updateField('contactPhone', v)} 
                        error={errors.contactPhone}
                        tooltip="A direct line for rapid employer follow-up."
                      />
                    </div>
                  </div>

                  {/* New Advanced Filtering Section */}
                  <div className="md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Filter className="text-blue-600" size={20} />
                      Partnership Management (Advanced)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField 
                        label="Exclusions" 
                        example="Acme Corp, Global Industries, TechFlow" 
                        value={form.currentPartners} 
                        onChange={(v: string) => updateField('currentPartners', v)} 
                        tooltip="List companies you already work with or who have opted out. E^3 will exclude these from new discovery results."
                        placeholder="Company A, Company B, Company C..."
                        isTextArea={true}
                      />
                      <FormField 
                        label="Past Employer Partners (Reconnection)" 
                        example="Legacy Mfg, Old Town Logistics" 
                        value={form.pastPartners} 
                        onChange={(v: string) => updateField('pastPartners', v)} 
                        tooltip="List dormant partners. E^3 will prioritize finding valid reconnection opportunities for these companies."
                        placeholder="Company X, Company Y, Company Z..."
                        isTextArea={true}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6 pt-6 pb-16">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <input id="termsAccepted" type="checkbox" checked={form.termsAccepted} onChange={(e) => updateField('termsAccepted', e.target.checked)} className="h-5 w-5 text-blue-600 border-slate-300 rounded" />
                      <div className="text-sm leading-6">
                        <label htmlFor="termsAccepted" className="font-bold text-slate-900">Accept <button type="button" onClick={() => setStep('terms')} className="text-blue-600 underline">Terms and Conditions</button></label>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <input id="emailPolicyAccepted" type="checkbox" checked={form.emailPolicyAccepted} onChange={(e) => updateField('emailPolicyAccepted', e.target.checked)} className="h-5 w-5 text-blue-600 border-slate-300 rounded" />
                      <div className="text-sm leading-6">
                        <label htmlFor="emailPolicyAccepted" className="font-bold text-slate-900">Accept <button type="button" onClick={() => setStep('email-policy')} className="text-blue-600 underline">Email Use Policy</button></label>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 outline-none">Go to Step 2</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {step === 'discovery' && profile && (
            <div className="w-full space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                    <BadgeCheck size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Step 2: Verify Program Profile</h2>
                    <p className="text-sm text-slate-500 font-bold">Review the AI-enhanced program strategic report.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                  <button 
                    type="button"
                    onClick={() => setStep('intake')}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-black transition-all outline-none"
                  >
                    <Edit2 size={18} />
                    Revise Profile
                  </button>
                  <button 
                    type="button"
                    onClick={handleRunDiscovery} 
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-200 transition-all hover:scale-105 active:scale-95 outline-none"
                  >
                    <Search size={18} />
                    3. Scan Local Markets
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap size={80} />
                    </div>
                    <h3 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest mb-4">
                      <Sparkles size={14} /> The Elevator Pitch
                    </h3>
                    <p className="text-xl md:text-2xl font-bold text-slate-900 leading-tight italic">
                      "{profile.elevatorPitch}"
                    </p>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                      <TrendingUp size={16} /> Regional Labor Market Analytics
                    </h3>
                    <div className="prose prose-slate max-w-none">
                      <div className="flex items-start gap-4 p-5 bg-blue-50 rounded-3xl border border-blue-100">
                        <MapPin className="text-blue-600 shrink-0 mt-1" size={24} />
                        <div>
                          <p className="font-bold text-slate-900 text-lg mb-1">{profile.region} Economic Overview</p>
                          <p className="text-slate-600 font-medium leading-relaxed">
                            {profile.geoAnalytics}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {profile.siteSummary && (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                      <h3 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                        <Globe size={16} /> Program Page Intelligence
                      </h3>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                        <Monitor className="text-slate-400 shrink-0" size={24} />
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                          {profile.siteSummary}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Common Industries</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.industries.map((ind, i) => (
                          <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Target Job Titles</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.targetJobTitles.map((title, i) => (
                          <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold border border-blue-100">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
                      <DollarSign size={100} />
                    </div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Estimated Local Wage Range</h3>
                    <p className="text-2xl md:text-3xl font-black tracking-tight break-words leading-tight">{profile.wageRange}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Based on local hiring data</p>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Primary Contact</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Name</p>
                          <p className="font-bold text-slate-900">{form.contactName || 'Not identified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <MailIcon size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Email</p>
                          <p className="font-bold text-slate-900 truncate max-w-[150px]">{form.contactEmail || 'Not identified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Phone</p>
                          <p className="font-bold text-slate-900">{form.contactPhone || 'Not identified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Address</p>
                          <p className="font-bold text-slate-900">{form.contactAddress || 'Not identified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-200">
                    <h3 className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-widest mb-4">
                      <HardHat size={16} /> Safety & Compliance
                    </h3>
                    <p className="text-sm font-bold text-amber-900 leading-relaxed">
                      {profile.safetyAssessment}
                    </p>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Core Hard Skills</h3>
                    <ul className="space-y-3">
                      {profile.skills.hard.map((skill, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Essential Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.soft.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-black uppercase tracking-wider">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                 <div>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Step 3. Employer Match Report</h2>
                   <p className="text-sm text-slate-500 font-bold">Ranked matches based on program alignment.</p>
                 </div>
                 <div className="flex flex-wrap gap-3 w-full md:w-auto">
                   <button 
                    type="button"
                    onClick={downloadMatchReport}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-xs md:text-sm outline-none"
                   >
                     <Download size={18} />
                     Download CSV for your CRM
                   </button>
                   <button 
                    type="button"
                    onClick={handleRunDiscovery} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-xs md:text-sm outline-none"
                   >
                     <Search size={18} />
                     3. Scan Local Markets
                   </button>
                   <button 
                    type="button"
                    onClick={() => setStep('outreach')} 
                    className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                   >
                    4. Build Campaigns <ArrowRight size={18} />
                   </button>
                 </div>
              </header>
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Employer</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">NAICS</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Size</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Intelligence</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 min-w-[200px]">Alignment Score</th>
                      <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-right">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matches.map((m) => {
                      const isReconnect = m.rationale.startsWith('[RECONNECT]');
                      const displayRationale = isReconnect ? m.rationale.replace('[RECONNECT]', '').trim() : m.rationale;

                      return (
                      <tr key={m.name} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => toggleEmployerSelection(m.name)} className={`p-1 rounded-lg transition-colors ${selectedEmployers.has(m.name) ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-blue-400'}`}>
                              {selectedEmployers.has(m.name) ? <CheckSquare size={22} /> : <Square size={22} />}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900">{m.name}</span>
                                {isReconnect && (
                                  <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-purple-200 flex items-center gap-1">
                                    <History size={10} /> Reconnect
                                  </span>
                                )}
                              </div>
                              {isReconnect && (
                                <p className="text-[10px] text-slate-500 font-bold mt-1 max-w-[200px] truncate">{displayRationale}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            {m.naicsCode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap uppercase tracking-tighter">
                            {m.employeeCount || 'N/A'} Employees
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5">
                            {m.website && (
                              <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-bold">
                                <Globe size={12} /> Web
                              </a>
                            )}
                            {(m.phone || m.contactEmail) && (
                              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                <Search size={10} /> Data Ready
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                  m.score >= 90 ? 'bg-emerald-500' :
                                  m.score >= 75 ? 'bg-blue-500' :
                                  m.score >= 60 ? 'bg-amber-500' :
                                  'bg-slate-400'
                                }`}
                                style={{ width: `${m.score}%` }}
                              />
                            </div>
                            <span className={`text-xs font-black w-10 text-right ${
                              m.score >= 90 ? 'text-emerald-700' :
                              m.score >= 75 ? 'text-blue-700' :
                              m.score >= 60 ? 'text-amber-700' :
                              'text-slate-700'
                            }`}>{m.score}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            type="button" 
                            onClick={() => {
                              setSelectedEmployers(new Set([m.name])); 
                              handleGenerateOutreach(m); 
                              setStep('outreach'); 
                            }} 
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-black transition-all active:scale-95"
                          >
                            Campaign
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'outreach' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <MailIcon className="text-blue-600" size={28} />
                    Campaign Outreach
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 font-bold">
                    Targeting {filteredMatches.length} employers with segmented AI strategy.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button 
                    type="button"
                    onClick={() => setStep('report')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-300 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all text-xs md:text-sm outline-none shadow-sm"
                  >
                    Adjust Matches
                  </button>
                  {filteredMatches.length > 0 && (
                    <button 
                      type="button"
                      onClick={handleCopyAllOutreach}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black shadow-xl transition-all text-xs md:text-sm outline-none"
                    >
                      <CopyCheck size={18} />
                      Copy Campaign to Clipboard
                    </button>
                  )}
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredMatches.map(match => (
                  <div 
                    key={match.name} 
                    className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-slate-200 hover:border-blue-400 transition-all group flex flex-col gap-5 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${outreachData[match.name] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-400 animate-pulse'}`} />
                          <p className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-widest truncate">
                            {outreachData[match.name] ? 'Assets Ready' : 'Pending Build'}
                          </p>
                        </div>
                        <h3 className="font-black text-lg text-slate-900 truncate leading-tight" title={match.name}>{match.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-black px-2 py-0.5 rounded-lg uppercase tracking-tight">
                            {match.segment.split('&')[0]}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleGenerateOutreach(match)}
                        className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-md active:scale-95 outline-none ${
                          outreachData[match.name] 
                          ? 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                        }`}
                        title={outreachData[match.name] ? 'Regenerate Campaign' : 'Build Campaign'}
                      >
                        {loading && !outreachData[match.name] ? <Loader2 size={20} className="animate-spin" /> : <ZapIcon size={20} fill={!outreachData[match.name] ? "currentColor" : "none"} />}
                      </button>
                    </div>

                    <div className="flex-1">
                      {outreachData[match.name] ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 gap-2.5">
                            <button 
                              type="button"
                              onClick={() => setActiveModal({ type: 'followups', employer: match.name })}
                              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors group/item"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                                  <MailIcon size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Emails</p>
                                  <p className="text-sm font-bold text-slate-900">4-Touch Sequence</p>
                                </div>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover/item:text-blue-500 group-hover/item:translate-x-1 transition-all" />
                            </button>

                            <button 
                              type="button"
                              onClick={() => setActiveModal({ type: 'linkedin', employer: match.name })}
                              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors group/item"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                                  <Linkedin size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Direct Outreach</p>
                                  <p className="text-sm font-bold text-slate-900">Tailored LinkedIn DM</p>
                                </div>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover/item:text-blue-500 group-hover/item:translate-x-1 transition-all" />
                            </button>

                            <button 
                              type="button"
                              onClick={() => setActiveModal({ type: 'script', employer: match.name })}
                              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-colors group/item"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                                  <Phone size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Voice Engagement</p>
                                  <p className="text-sm font-bold text-slate-900">Discovery Call Script</p>
                                </div>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover/item:text-blue-500 group-hover/item:translate-x-1 transition-all" />
                            </button>
                          </div>
                          
                          <div className="pt-2">
                             <button 
                              onClick={() => handleGenerateOutreach(match)}
                              className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                             >
                               <RefreshCw size={12} /> Regenerate All
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 gap-4 group-hover:bg-slate-50 transition-colors">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner text-slate-300">
                            <Sparkles size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-600">Strategy Awaiting Activation</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                              Click the lightning bolt to build this campaign.
                            </p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleGenerateOutreach(match)}
                            className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
                          >
                            Build Campaign
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'linkedin' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-16">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0077b5] text-white rounded-2xl shadow-lg">
                    <Linkedin size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Step 5: LinkedIn Content Engine</h2>
                    <p className="text-sm text-slate-500 font-bold italic">High-Impact Employer-Focused Campaigns</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <button 
                    type="button"
                    onClick={handleGenerateLinkedin}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black shadow-xl transition-all hover:scale-105 active:scale-95 outline-none"
                  >
                    <Sparkle size={18} />
                    Generate 10-Post Strategy
                  </button>
                  {linkedinPosts.length > 0 && (
                    <button 
                      type="button"
                      onClick={handleCopyAllLinkedInPosts}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0077b5] hover:bg-[#005c8c] text-white px-6 py-3.5 rounded-2xl font-black shadow-xl transition-all hover:scale-105 active:scale-95 outline-none"
                    >
                      <CopyCheck size={18} />
                      Copy All
                    </button>
                  )}
                </div>
              </header>

              {linkedinPosts.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-200 shadow-sm space-y-6">
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Linkedin size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Ready to Scale Your Reach?</h3>
                  <p className="text-slate-500 max-w-md mx-auto font-medium">Click the button above to generate 10 unique, ROI-focused LinkedIn posts tailored to your program's goals and target industries.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-12">
                  {linkedinPosts.map((post, idx) => (
                    <div key={idx} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden group">
                      <div className="p-1 px-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Post Campaign Day 0{idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${post.imageUrl ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          <span className="text-[9px] font-black text-slate-400 uppercase">{post.imageUrl ? 'Graphic Ready' : 'Reviewing Copy'}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-span-7 p-8 lg:p-10 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                              <Layers size={18} />
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Campaign Pillar</h3>
                              <p className="text-lg font-bold text-blue-600">{post.pillar}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Engagement Copy</label>
                            <textarea
                              value={post.content}
                              onChange={(e) => handleUpdatePost(idx, { content: e.target.value })}
                              className="w-full min-h-[180px] p-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 leading-relaxed text-sm transition-all"
                              placeholder="Edit post content..."
                            />
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-2">
                                <Hash size={12} /> Active Hashtags
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {post.hashtags.map((tag, tIdx) => (
                                  <div key={tIdx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100 flex items-center gap-1.5 animate-in zoom-in-95">
                                    #{tag}
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdatePost(idx, { hashtags: post.hashtags.filter((_, i) => i !== tIdx) })}
                                      className="hover:text-red-500 transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                                {post.hashtags.length === 0 && (
                                  <p className="text-xs text-slate-400 font-bold italic py-1.5">No hashtags added yet.</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-2">
                                  <TrendingIcon size={12} className="text-emerald-500" /> Suggested Booster Tags
                                </label>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">High Visibility</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {suggestedHashtagsBank
                                  .filter(tag => !post.hashtags.includes(tag))
                                  .slice(0, 8)
                                  .map((tag, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => handleUpdatePost(idx, { hashtags: [...post.hashtags, tag] })}
                                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                    >
                                      + #{tag}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 flex flex-wrap gap-4">
                            <button 
                              type="button"
                              onClick={() => copyToClipboard(`${post.content}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`)}
                              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg"
                            >
                              <Copy size={18} /> Copy Text & Tags
                            </button>
                            <ActionButtons text={post.content} label={`LinkedIn Post ${idx + 1}`} />
                          </div>
                        </div>

                        <div className="lg:col-span-5 bg-slate-50 border-l border-slate-100 p-8 lg:p-10 flex flex-col items-center">
                          <div className="w-full max-w-[320px] aspect-square bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative group/img">
                            {post.imageUrl ? (
                              <img src={post.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                {generatingImages[idx] ? (
                                  <>
                                    <Loader2 size={48} className="text-blue-600 animate-spin" />
                                    <p className="text-sm font-bold text-slate-500 animate-pulse">Designing Graphic...</p>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center">
                                      <ImageIcon size={32} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">Click below to build a custom AI background for this post.</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="w-full max-w-[320px] mt-8 space-y-3">
                            <button 
                              type="button" 
                              onClick={() => handleGenerateGraphic(idx)}
                              disabled={generatingImages[idx]}
                              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-lg disabled:opacity-50 ${
                                post.imageUrl 
                                ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <RefreshCw size={18} className={generatingImages[idx] ? 'animate-spin' : ''} />
                              {post.imageUrl ? 'Regenerate Graphic' : 'Generate Graphic'}
                            </button>

                            {post.imageUrl && (
                              <div className="grid grid-cols-2 gap-3">
                                <button 
                                  type="button"
                                  onClick={() => handleDownloadImage(post.imageUrl!, `Post_${idx + 1}`)}
                                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                                >
                                  <Download size={16} /> Download
                                </button>
                                <button 
                                  type="button"
                                  onClick={handleCopyAllLinkedInPosts}
                                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                                >
                                  <Copy size={16} /> Copy All
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'chat' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden min-h-0 bg-slate-50 md:px-0 md:pt-0 md:pb-0">
              <div className="bg-white md:shadow-none flex flex-col flex-1 overflow-hidden min-h-0">
                <header className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900 text-sm">Strategy Assistant</h2>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Online & Grounded</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setChatMessages([])} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter">Reset Chat</button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 min-h-0 no-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-6 max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Briefcase size={32} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-900 font-black text-lg tracking-tight">Find your next partnership</p>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                          Ask me to find employers in your area, or scan for job titles that would make great workforce partnerships.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 w-full">
                        {['Find tech jobs in Atlanta', 'Manufacturers in Chicago', 'Health systems hiring nurses'].map((prompt, pIdx) => (
                          <button 
                            key={pIdx} 
                            onClick={() => handleSendChat(prompt)}
                            className="text-left p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                          >
                            "{prompt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`max-w-[88%] p-4 rounded-2xl text-sm font-medium shadow-sm flex flex-col gap-3 ${msg.role === 'user' ? 'bg-white border border-slate-200 text-slate-900 rounded-tr-none' : 'bg-white border border-blue-100 text-slate-800 rounded-tl-none'}`}>
                        <MarkdownText text={msg.text} />
                        
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-1 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ExternalLink size={10} /> Verified Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((source, idx) => (
                                <a 
                                  key={idx} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-all max-w-full truncate flex items-center gap-1"
                                >
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 px-10">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assistant is thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-20 md:h-8" />
                </div>

                <div className="p-3 bg-white border-t border-slate-100 shrink-0 lg:relative lg:pb-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:mb-0 mb-16 lg:shadow-none sticky bottom-0">
                  <div className="relative flex items-center max-w-3xl mx-auto w-full">
                    <input 
                      type="text" value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="Ask for local leads..."
                      className="w-full p-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-900 text-sm shadow-inner transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleSendChat()} 
                      disabled={isChatLoading || !chatInput.trim()} 
                      className="absolute right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-30 disabled:hover:bg-blue-600 active:scale-90"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'support' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden min-h-0 bg-slate-50 md:px-0 md:pt-0 md:pb-0">
              <div className="bg-white md:shadow-none flex flex-col flex-1 overflow-hidden min-h-0">
                <header className="p-4 border-b border-indigo-100 bg-indigo-50/30 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                      <LifeBuoy size={18} />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900 text-sm">System Support Expert</h2>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Application Knowledge Active</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupportMessages([])} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter">Clear Session</button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 min-h-0 no-scrollbar">
                  {supportMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-6 max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Zap size={32} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-900 font-black text-lg tracking-tight">E^3 Command Central</p>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                          Ask me anything about how E^3 works, how to manage partnerships, or how to build your LinkedIn strategy.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 w-full">
                        {[
                          'How do I exclude current partners?', 
                          'How is the match score calculated?', 
                          'How do I generate LinkedIn graphics?',
                          'What is the Campaign Builder?'
                        ].map((prompt, pIdx) => (
                          <button 
                            key={pIdx} 
                            onClick={() => handleSendSupport(prompt, 'page')}
                            className="text-left p-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                          >
                            "{prompt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {supportMessages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`max-w-[88%] p-4 rounded-2xl text-sm font-medium shadow-sm flex flex-col gap-3 ${msg.role === 'user' ? 'bg-white border border-slate-200 text-slate-900 rounded-tr-none' : 'bg-white border border-indigo-100 text-slate-800 rounded-tl-none'}`}>
                        <MarkdownText text={msg.text} />
                      </div>
                    </div>
                  ))}
                  {isSupportLoading && (
                    <div className="flex items-center gap-2 px-10">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expert is replying...</span>
                    </div>
                  )}
                  <div ref={supportEndRef} className="h-20 md:h-8" />
                </div>

                <div className="p-3 bg-white border-t border-slate-100 shrink-0 lg:relative lg:pb-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:mb-0 mb-16 lg:shadow-none sticky bottom-0">
                  <div className="relative flex items-center max-w-3xl mx-auto w-full">
                    <input 
                      type="text" value={supportInput} 
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendSupport(undefined, 'page')}
                      placeholder="How do I..."
                      className="w-full p-3.5 pr-12 bg-slate-50 border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-slate-900 text-sm shadow-inner transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleSendSupport(undefined, 'page')} 
                      disabled={isSupportLoading || !supportInput.trim()} 
                      className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 active:scale-90"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'terms' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden bg-white md:border md:border-slate-200 md:rounded-[2rem] md:shadow-sm px-4 md:px-8 pt-4 md:pt-8">
              <header className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Gavel className="text-slate-900" size={20} />
                  <h2 className="font-black text-slate-900 uppercase text-xs tracking-[0.15em]">Terms & Conditions of Use</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep(profile ? 'discovery' : 'landing')} 
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase transition-colors"
                >
                  <ArrowLeft size={14} /> Return to Engine
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 min-h-0 bg-white selection:bg-blue-100 no-scrollbar">
                <div className="max-w-3xl mx-auto">
                  <TermsContent />

                  <div className="pt-12 border-t border-slate-100 text-center space-y-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest">End of Terms</p>
                    <button 
                      type="button"
                      onClick={() => setStep(profile ? 'discovery' : 'landing')} 
                      className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl"
                    >
                      Accept and Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'privacy' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden bg-white md:border md:border-slate-200 md:rounded-[2rem] md:shadow-sm px-4 md:px-8 pt-4 md:pt-8">
              <header className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-slate-900" size={20} />
                  <h2 className="font-black text-slate-900 uppercase text-xs tracking-[0.15em]">Privacy Policy</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep(profile ? 'discovery' : 'landing')} 
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase transition-colors"
                >
                  <ArrowLeft size={14} /> Return to Engine
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 min-h-0 bg-white selection:bg-blue-100 no-scrollbar">
                <div className="max-w-3xl mx-auto space-y-8 font-mono text-[11px] leading-relaxed text-slate-700">
                  <section className="space-y-4">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">1. Information We Collect</h3>
                    <p>
                      We collect information you provide directly to us, such as when you create an account, update your profile, or use our interactive features. This includes:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Contact information (name, email address, phone number)</li>
                      <li>Professional details (job title, organization, industry)</li>
                      <li>Program data (workforce program descriptions, target demographics)</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">2. How We Use Your Information</h3>
                    <p>
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Provide, maintain, and improve the E^3 Engine services.</li>
                      <li>Generate customized outreach materials and strategic reports.</li>
                      <li>Communicate with you about products, services, offers, and events.</li>
                      <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">3. Data Sharing</h3>
                    <p>
                      We do not share your personal information with third parties except as described in this policy:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</li>
                      <li>In response to a request for information if we believe disclosure is in accordance with any applicable law, regulation, or legal process.</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-2">4. Data Security</h3>
                    <p>
                      We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
                    </p>
                  </section>

                  <div className="pt-12 border-t border-slate-100 text-center space-y-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest">End of Privacy Policy</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'email-policy' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden bg-white md:border md:border-slate-200 md:rounded-[2rem] md:shadow-sm px-4 md:px-8 pt-4 md:pt-8">
              <header className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <MailIcon className="text-slate-900" size={20} />
                  <h2 className="font-black text-slate-900 uppercase text-xs tracking-[0.15em]">Email Use Policy (CAN-SPAM)</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep(profile ? 'discovery' : 'landing')} 
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase transition-colors"
                >
                  <ArrowLeft size={14} /> Return to Engine
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 min-h-0 bg-white selection:bg-blue-100 no-scrollbar">
                <div className="max-w-3xl mx-auto">
                  <EmailPolicyContent />

                  <div className="pt-12 border-t border-slate-100 text-center space-y-4">
                    <p className="font-black text-slate-400 uppercase tracking-widest">End of Email Policy</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'docs' && (
            <div className="flex flex-col flex-1 animate-in fade-in duration-700 overflow-hidden bg-slate-50 md:border md:border-slate-200 md:rounded-[2rem] md:shadow-sm px-4 md:px-8 pt-4 md:pt-8">
              <header className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <Terminal className="text-blue-600" size={20} />
                  <h2 className="font-black text-slate-900 uppercase text-xs tracking-[0.15em]">Documentation & System Protocol</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep(profile ? 'discovery' : 'landing')} 
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Engine
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 min-h-0 bg-white no-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12 font-mono text-[11px] leading-relaxed text-slate-600">
                  
                  <section id="docs-process" className="space-y-6">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b-2 border-slate-900 pb-2 flex items-center gap-2">
                      <Rocket size={14} /> [01] The E^3 User Journey
                    </h3>
                    <div className="space-y-4">
                      <p>The E^3 workflow is engineered to move from raw institutional data to active market engagement in four distinct cycles:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                          <p className="font-black text-slate-900 uppercase text-[10px] mb-2">Cycle A: Intake</p>
                          <p>Define program parameters via Manual Form or the E^3 AI Assistant. This establishes the "Source Truth" for the engine matching logic.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                          <p className="font-black text-slate-900 uppercase text-[10px] mb-2">Cycle B: Discovery</p>
                          <p>AI scans regional labor indices and employer databases to identify high-probability partnership matches for your specific sector.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                          <p className="font-black text-slate-900 uppercase text-[10px] mb-2">Cycle C: Campaign</p>
                          <p>Tailored outreach assets (Email, Call Scripts, LinkedIn DMs) are auto-generated based on specific employer ROI segments.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                          <p className="font-black text-slate-900 uppercase text-[10px] mb-2">Cycle D: Visibility</p>
                          <p>A 10-post LinkedIn content strategy with AI-generated graphics builds regional brand authority for the program.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="docs-impact" className="space-y-6">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b-2 border-slate-900 pb-2 flex items-center gap-2">
                      <TrendingUp size={14} /> [02] How to Get the Most Out of This
                    </h3>
                    <div className="space-y-4">
                      <p>To optimize the engine's output quality, observe the following best practices:</p>
                      <ul className="space-y-4">
                        <li className="flex gap-4">
                          <div className="font-black text-blue-600 shrink-0">SPECIFICITY:</div>
                          <p>When defining industries, use specific sub-sectors (e.g., "Additive Manufacturing" vs "General Factory"). The discovery logic relies on these keywords to pull accurate market data.</p>
                        </li>
                        <li className="flex gap-4">
                          <div className="font-black text-blue-600 shrink-0">URL SCANNING:</div>
                          <p>Always provide a Program Page URL if available. E^3 will deep-scan the content to verify skills, credentials, and contact persons, often discovering details omitted in manual entry.</p>
                        </li>
                        <li className="flex gap-4">
                          <div className="font-black text-blue-600 shrink-0">REGENERATION:</div>
                          <p>If an employer match or LinkedIn graphic doesn't meet institutional standards, use the "Refresh" or "Regenerate" buttons. The Gemini engine learns from these context switches in a single session.</p>
                        </li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b-2 border-slate-900 pb-2 flex items-center gap-2">
                      <ShieldCheck size={14} /> [03] Human-in-the-Loop Protocol
                    </h3>
                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                      <p className="font-black text-blue-900 uppercase text-[10px]">CRITICAL OPERATING REQUIREMENT</p>
                      <p className="text-blue-800 text-xs">
                        E^3 is an augmentation tool, not an autonomous agent. Institutional staff MUST review all outreach before transmission.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-blue-800 text-[10px]">
                        <li>Verify that wage estimates align with current local union or institutional minimums.</li>
                        <li>Check that safety assessments match specific insurance or OSHA requirements.</li>
                        <li>Ensure LinkedIn graphics adhere to institutional brand style guides.</li>
                      </ul>
                    </div>
                  </section>

                  <section id="docs-compliance" className="space-y-6">
                    <h3 className="text-slate-900 font-black uppercase text-xs border-b-2 border-slate-900 pb-2 flex items-center gap-2">
                      <MessageSquare size={14} /> [04] Interactive System Architecture
                    </h3>
                    <p>
                      E^3 is an <strong>Interactive Intelligence App</strong>. Unlike static forms, the E^3 Assistant (Chat mode) allows you to "talk" your program into existence. You can provide rough notes, and the engine will structure them into a professional profile automatically.
                    </p>
                    <div className="bg-slate-900 text-blue-400 p-4 rounded-xl text-[10px] font-mono">
                      // SYSTEM_LOG: Running v3.1 Engine<br/>
                      // MODULE: Neural_Intake_Assistant<br/>
                      // STATUS: Ready_for_Query
                    </div>
                  </section>

                  <div className="pt-12 border-t border-slate-100 text-center space-y-6">
                    <h3 className="font-black text-slate-900 uppercase text-sm">Let's Get Started</h3>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        type="button"
                        onClick={() => setStep('intake')} 
                        className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                      >
                        Start Manual Intake
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStep('chat')} 
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl"
                      >
                        Launch AI Assistant
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4 italic">The engine is primed and awaiting your program data.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dynamic Mobile Navigation */}
      {step !== 'landing' && (
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-inset-bottom animate-in slide-in-from-bottom duration-500"
          aria-label="Primary Mobile Navigation"
        >
           <div className="flex justify-around items-stretch h-16 max-lg mx-auto px-1">
            <button 
              type="button" 
              onClick={() => { setStep('landing'); stopSpeech(); }}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${(step as any) === 'landing' ? 'text-blue-700' : 'text-slate-600'}`}
            >
               <div className="flex flex-col items-center">
                 <Layout size={18} />
                 <span className={`text-[8px] uppercase tracking-wide font-bold`}>Home</span>
               </div>
            </button>
            
            <button 
              type="button" 
              onClick={() => { setStep(getWorkflowTarget()); stopSpeech(); }}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${isWorkflowActive ? 'text-blue-700' : 'text-slate-600'}`}
            >
               <Target size={18} />
               <span className={`text-[8px] uppercase tracking-wide font-bold`}>Engine</span>
            </button>
            
            <button 
              type="button" 
              onClick={() => { setStep('chat'); stopSpeech(); }}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${step === 'chat' ? 'text-blue-700' : 'text-slate-600'}`}
            >
               <Search size={18} />
               <span className={`text-[8px] uppercase tracking-wide font-bold`}>Search</span>
            </button>

            <button 
              type="button" 
              onClick={() => { if(profile) { setStep('linkedin'); stopSpeech(); } }}
              disabled={!profile}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${!profile ? 'text-slate-300' : (step === 'linkedin' ? 'text-[#0077b5]' : 'text-slate-600')}`}
            >
               <Linkedin size={18} />
               <span className={`text-[8px] uppercase tracking-wide font-bold`}>Social</span>
            </button>

            <button 
              type="button" 
              onClick={() => { setStep('dashboard'); stopSpeech(); }}
              disabled={!profile}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${!profile ? 'text-slate-300' : (step === 'dashboard' ? 'text-blue-700' : 'text-slate-600')}`}
            >
               <PieChart size={18} />
               <span className={`text-[8px] uppercase tracking-wide font-bold`}>Stats</span>
            </button>
            
            <button 
              type="button" 
              onClick={() => { setStep('docs'); stopSpeech(); }}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all outline-none ${step === 'docs' ? 'text-blue-700' : 'text-slate-600'}`}
            >
               <BookOpen size={18} />
               <span className={`text-[8px] uppercase tracking-wide font-bold`}>Lib</span>
            </button>
          </div>
        </nav>
      )}

      {/* Email Provider Selector Modal */}
      {activeEmailSelector && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <MailIcon size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Select Email Client</h3>
                  <p className="text-[10px] font-bold text-slate-500">Choose how to open your message</p>
                </div>
              </div>
              <button type="button" onClick={() => setActiveEmailSelector(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </header>
            
            <div className="p-8 space-y-4">
              <button 
                onClick={() => triggerEmailProvider('default')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-600 group-hover:text-blue-600 transition-colors">
                    <Monitor size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Default Mail App</p>
                    <p className="text-[10px] font-bold text-slate-500">Outlook, Apple Mail, etc.</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => triggerEmailProvider('gmail')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-red-600">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Gmail</p>
                    <p className="text-[10px] font-bold text-slate-500">Open in Google Workspace</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => triggerEmailProvider('outlook')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-sky-600">
                    <Cloud size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Outlook Web</p>
                    <p className="text-[10px] font-bold text-slate-500">Open in Office 365</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => triggerEmailProvider('yahoo')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-purple-600">
                    <Zap size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Yahoo Mail</p>
                    <p className="text-[10px] font-bold text-slate-500">Open in Yahoo portal</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </button>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => {
                    copyToClipboard(activeEmailSelector.body);
                    alert("Email body copied to clipboard!");
                  }}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Copy size={12} /> Just Copy Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Assistant Bot UI */}
      <div className={`fixed bottom-24 right-6 z-[200] transition-all duration-300 transform ${isBotOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
        <div className="w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden origin-bottom-right">
          <header className="p-4 bg-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Cpu size={20} />
              <span className="font-black text-sm uppercase tracking-widest">E^3 Expert Assistant</span>
            </div>
            <button onClick={() => setIsBotOpen(false)} className="p-1 hover:bg-indigo-500 rounded-lg transition-colors">
              <Minus size={20} />
            </button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 no-scrollbar">
            {botMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-xs font-bold shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                  <MarkdownText text={m.text} />
                </div>
              </div>
            ))}
            {isBotLoading && (
              <div className="flex items-center gap-2 p-2">
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span className="text-[10px] font-black uppercase text-slate-400">Assistant is thinking...</span>
              </div>
            )}
            <div ref={botEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={botInput} 
                onChange={e => setBotInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendSupport(undefined, 'floating')}
                placeholder="How do I..." 
                className="flex-1 bg-slate-100 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100 focus:border-indigo-300 transition-all"
              />
              <button 
                onClick={() => handleSendSupport(undefined, 'floating')} 
                disabled={isBotLoading || !botInput.trim()} 
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Toggle Button */}
      <button 
        onClick={() => setIsBotOpen(!isBotOpen)}
        className={`fixed bottom-6 right-6 z-[201] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isBotOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-indigo-600 text-white'}`}
        aria-label="Toggle Expert Assistant"
      >
        {isBotOpen ? <X size={24} /> : <Cpu size={24} className="animate-pulse" />}
      </button>

      {/* Reset Toast & Modals */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[300] transition-all duration-500 ease-out pointer-events-none ${showResetToast ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-spin duration-[2000ms]">
            <RotateCcw size={18} />
          </div>
          <div className="flex flex-col pr-4">
            <span className="text-xs font-black uppercase tracking-widest">Engine Re-primed</span>
            <span className="text-[10px] font-bold text-slate-400">All program assets successfully pruned.</span>
          </div>
        </div>
      </div>

      {isResetModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <TriangleAlert size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Clear Engine Run?</h3>
                <p className="text-slate-500 font-medium leading-relaxed">This will permanently clear all current program data and matches.</p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button onClick={performResetEngine} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95">Confirm: Clear All Data</button>
                <button onClick={() => setIsResetModalOpen(false)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm transition-all active:scale-95">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outreach Modals */}
      {activeModal && outreachData[activeModal.employer] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  {activeModal.type === 'followups' ? <MailIcon size={20} /> : activeModal.type === 'script' ? <Phone size={20} /> : <Linkedin size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{activeModal.type}</h3>
                  <p className="text-sm font-bold text-slate-500">{activeModal.employer}</p>
                  {currentEmployer?.contactEmail && (
                    <div className="flex items-center gap-1.5 mt-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                      <MailIcon size={12} />
                      <span className="text-xs font-bold">{currentEmployer.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/30">
              {activeModal.type === 'followups' && (
                <>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4"><span className="text-blue-600 uppercase tracking-widest text-[10px] font-black">Primary Email</span><ActionButtons text={outreachData[activeModal.employer].primaryEmail} label="Primary Email" onEmail={() => handleEmailExport(currentEmployer?.contactEmail || '', outreachData[activeModal.employer].subjectLines?.[0] || 'Opportunity', outreachData[activeModal.employer].primaryEmail)} /></div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">{outreachData[activeModal.employer].primaryEmail}</p>
                  </div>
                  {outreachData[activeModal.employer].followUps.map((text, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4"><span className="text-blue-600 uppercase tracking-widest text-[10px] font-black">Follow-up {i + 1}</span><ActionButtons text={text} label={`Follow-up ${i + 1}`} onEmail={() => handleEmailExport(currentEmployer?.contactEmail || '', `Re: ${outreachData[activeModal.employer].subjectLines?.[0] || 'Opportunity'}`, text)} /></div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">{text}</p>
                    </div>
                  ))}
                </>
              )}
              {activeModal.type === 'script' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><span className="text-blue-600 uppercase tracking-widest text-[10px] font-black">Call Guide</span><ActionButtons text={outreachData[activeModal.employer].callScript.join('\n')} label="Call Script" /></div>
                  <ul className="space-y-4">
                    {outreachData[activeModal.employer].callScript.map((step, i) => (
                      <li key={i} className="flex gap-4 items-start"><div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i+1}</div><p className="text-slate-700 text-sm font-bold">{step}</p></li>
                    ))}
                  </ul>
                </div>
              )}
              {activeModal.type === 'linkedin' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><span className="text-blue-600 uppercase tracking-widest text-[10px] font-black">Direct Message</span><ActionButtons text={outreachData[activeModal.employer].linkedInMessage} label="LinkedIn Message" /></div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap italic text-sm font-medium">{outreachData[activeModal.employer].linkedInMessage}</p>
                </div>
              )}
            </div>
            <footer className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0"><button type="button" onClick={() => setActiveModal(null)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg">Close Details</button></footer>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <TermsModal isOpen={showTermsModal} onAccept={handleAcceptTerms} />
      <EmailPolicyModal isOpen={showEmailPolicyModal} onAccept={handleAcceptEmailPolicy} />

      {showComplianceSticky && (
        <div className="fixed bottom-6 right-24 z-[80] w-full max-w-xs animate-in slide-in-from-right duration-500">
           <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 relative overflow-hidden group">
             <button type="button" onClick={() => setShowComplianceSticky(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>
             <div className="flex items-center gap-3 mb-3"><div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={18} /></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Compliance Notice</span></div>
             <p className="text-[11px] font-medium text-slate-600 leading-relaxed">All outreach material contains the mandatory legal disclaimer. Please review regional EEO/FLSA guidelines.</p>
             <button type="button" onClick={() => navigateToDocSection('docs-compliance')} className="mt-3 text-[10px] font-black text-blue-600 hover:underline">View Compliance Paper</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
