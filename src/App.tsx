import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout, Plus, FileText, LogOut, User as UserIcon, Download, Trash2, Edit3, ChevronLeft, Save, Palette, Sparkles, Calendar, GripVertical, X, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Resume, ResumeData, User, Section } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ user, onLogout }: { user: User | null; onLogout: () => void }) => (
  <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900">
      <FileText className="text-indigo-600" />
      <span>ProResume</span>
    </Link>
    {user ? (
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
          <UserIcon size={18} />
          <span className="hidden sm:inline">{user.email}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-4">
        <Link to="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Login</Link>
        <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Register</Link>
      </div>
    )}
  </nav>
);

const AuthForm = ({ type, onAuth }: { type: 'login' | 'register'; onAuth: (token: string, user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/auth/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      onAuth(data.token, data.user);
      navigate('/');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-zinc-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            {type === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          {type === 'login' ? "Don't have an account? " : "Already have an account? "}
          <Link to={type === 'login' ? '/register' : '/login'} className="text-indigo-600 font-medium hover:underline">
            {type === 'login' ? 'Register' : 'Login'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

// --- Editor & Templates ---

const INITIAL_DATA: ResumeData = {
  personalInfo: { fullName: '', email: '', phone: '', location: '', website: '', summary: '' },
  sections: [
    { id: 'exp', title: 'Experience', type: 'experience', content: [] },
    { id: 'edu', title: 'Education', type: 'education', content: [] },
    { id: 'skills', title: 'Skills', type: 'list', content: [] }
  ]
};

const TEMPLATES = [
  { id: 'modern', name: 'Modern Indigo', color: 'indigo', image: 'https://picsum.photos/seed/resume1/400/560' },
  { id: 'minimal', name: 'Minimal Serif', color: 'zinc', image: 'https://picsum.photos/seed/resume2/400/560' },
  { id: 'professional', name: 'Professional Slate', color: 'slate', image: 'https://picsum.photos/seed/resume3/400/560' },
  { id: 'creative', name: 'Creative Emerald', color: 'emerald', image: 'https://picsum.photos/seed/resume4/400/560' },
  { id: 'classic', name: 'Classic Stone', color: 'stone', image: 'https://picsum.photos/seed/resume5/400/560' },
  { id: 'compact', name: 'Compact Zinc', color: 'zinc', image: 'https://picsum.photos/seed/resume6/400/560' },
  { id: 'elegant', name: 'Elegant Violet', color: 'violet', image: 'https://picsum.photos/seed/resume7/400/560' },
  { id: 'bold', name: 'Bold Black', color: 'black', image: 'https://picsum.photos/seed/resume8/400/560' },
  { id: 'soft', name: 'Soft Rose', color: 'rose', image: 'https://picsum.photos/seed/resume9/400/560' },
  { id: 'tech', name: 'Tech Cyan', color: 'cyan', image: 'https://picsum.photos/seed/resume10/400/560' },
  { id: 'clean', name: 'Clean Neutral', color: 'neutral', image: 'https://picsum.photos/seed/resume11/400/560' },
  { id: 'sunset', name: 'Sunset Orange', color: 'orange', image: 'https://picsum.photos/seed/resume12/400/560' }
];

const TemplateThumbnail = ({ template }: { template: typeof TEMPLATES[0] }) => {
  const accentColor = {
    indigo: 'bg-indigo-600',
    zinc: 'bg-zinc-600',
    slate: 'bg-slate-600',
    emerald: 'bg-emerald-600',
    stone: 'bg-stone-600',
    violet: 'bg-violet-600',
    black: 'bg-black',
    rose: 'bg-rose-600',
    cyan: 'bg-cyan-600',
    neutral: 'bg-neutral-600',
    orange: 'bg-orange-600'
  }[template.color] || 'bg-indigo-600';

  const lightAccent = {
    indigo: 'bg-indigo-50',
    zinc: 'bg-zinc-50',
    slate: 'bg-slate-50',
    emerald: 'bg-emerald-50',
    stone: 'bg-stone-50',
    violet: 'bg-violet-50',
    black: 'bg-zinc-100',
    rose: 'bg-rose-50',
    cyan: 'bg-cyan-50',
    neutral: 'bg-neutral-50',
    orange: 'bg-orange-50'
  }[template.color] || 'bg-indigo-50';

  // Layout variations
  const isSidebar = ['professional', 'tech', 'compact'].includes(template.id);
  const isCentered = ['minimal', 'elegant'].includes(template.id);
  const hasHeaderBg = ['creative', 'bold', 'sunset'].includes(template.id);

  return (
    <div className="w-full h-full bg-white p-4 flex flex-col gap-3">
      {/* Header */}
      <div className={cn(
        "flex flex-col gap-1",
        isCentered ? "items-center" : "items-start",
        hasHeaderBg && cn("p-3 -m-4 mb-2 rounded-t-none", accentColor)
      )}>
        <div className={cn("h-3 w-24 rounded", hasHeaderBg ? "bg-white" : accentColor)}></div>
        <div className="flex gap-1">
          <div className={cn("h-1 w-8 rounded", hasHeaderBg ? "bg-white/60" : "bg-zinc-200")}></div>
          <div className={cn("h-1 w-8 rounded", hasHeaderBg ? "bg-white/60" : "bg-zinc-200")}></div>
        </div>
      </div>

      <div className="flex gap-4 flex-1">
        {/* Sidebar if applicable */}
        {isSidebar && (
          <div className={cn("w-1/3 rounded-lg p-2 flex flex-col gap-3", lightAccent)}>
            <div className="space-y-1">
              <div className={cn("h-1.5 w-8 rounded", accentColor)}></div>
              <div className="h-1 w-full bg-zinc-200 rounded"></div>
              <div className="h-1 w-full bg-zinc-200 rounded"></div>
            </div>
            <div className="space-y-1">
              <div className={cn("h-1.5 w-8 rounded", accentColor)}></div>
              <div className="flex flex-wrap gap-1">
                <div className="h-2 w-4 bg-zinc-300 rounded"></div>
                <div className="h-2 w-6 bg-zinc-300 rounded"></div>
                <div className="h-2 w-3 bg-zinc-300 rounded"></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="space-y-2">
            <div className={cn("h-2 w-16 rounded", accentColor)}></div>
            <div className="space-y-1">
              <div className="h-1 w-full bg-zinc-100 rounded"></div>
              <div className="h-1 w-full bg-zinc-100 rounded"></div>
              <div className="h-1 w-2/3 bg-zinc-100 rounded"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className={cn("h-2 w-20 rounded", accentColor)}></div>
            <div className="flex justify-between items-center">
              <div className="h-1.5 w-12 bg-zinc-300 rounded"></div>
              <div className="h-1 w-8 bg-zinc-200 rounded"></div>
            </div>
            <div className="space-y-1">
              <div className="h-1 w-full bg-zinc-100 rounded"></div>
              <div className="h-1 w-full bg-zinc-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TemplateSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 text-sm font-medium mb-4">
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-zinc-900">Choose a Template</h1>
        <p className="text-zinc-600">Select a layout to start building your professional resume</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ y: -8 }}
            className="group cursor-pointer"
            onClick={() => navigate(`/editor/new?template=${template.id}`)}
          >
            <div className="relative aspect-[1/1.4] bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shadow-sm group-hover:shadow-xl group-hover:border-indigo-500 transition-all mb-4">
              <TemplateThumbnail template={template} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white text-zinc-900 px-6 py-2 rounded-full font-bold shadow-lg">Use Template</span>
              </div>
            </div>
            <h3 className="font-bold text-zinc-900 text-center">{template.name}</h3>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ token }: { token: string }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    const res = await fetch('/api/resumes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setResumes(data);
    }
    setLoading(false);
  };

  const deleteResume = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    const res = await fetch(`/api/resumes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchResumes();
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">My Resumes</h1>
          <p className="text-zinc-600">Manage and create your professional resumes</p>
        </div>
        <button
          onClick={() => navigate('/templates')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          <span>Create New</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : resumes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <motion.div
              key={resume.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <FileText size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => navigate(`/editor/${resume.id}`)} className="p-2 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => deleteResume(resume.id)} className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-1">{resume.title}</h3>
              <p className="text-sm text-zinc-500 mb-4">Last modified: {new Date(resume.lastModified).toLocaleDateString()}</p>
              <button
                onClick={() => navigate(`/editor/${resume.id}`)}
                className="w-full py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Open Editor
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-200">
          <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-zinc-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">No resumes yet</h3>
          <p className="text-zinc-500 mb-6">Start by creating your first professional resume</p>
          <button
            onClick={() => navigate('/templates')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Create your first resume
          </button>
        </div>
      )}
    </div>
  );
};

const SectionRenderer = ({ 
  section, 
  color, 
  hideTitle, 
  onReorderItem, 
  sectionIndex,
  onQuickEdit 
}: { 
  section: Section; 
  color: string; 
  hideTitle?: boolean; 
  onReorderItem?: (newContent: any[]) => void; 
  sectionIndex?: number;
  onQuickEdit?: (e: React.MouseEvent, path: string, value: string, type: 'text' | 'section', color?: string, link?: string, fontSize?: number) => void;
}) => {
  const colorClasses = {
    indigo: 'text-indigo-600',
    zinc: 'text-zinc-600',
    slate: 'text-slate-600',
    emerald: 'text-emerald-600',
    stone: 'text-stone-600',
    violet: 'text-violet-600',
    black: 'text-black',
    rose: 'text-rose-600',
    cyan: 'text-cyan-600',
    neutral: 'text-neutral-600',
    orange: 'text-orange-600'
  } as any;

  const textColor = section.titleColor || colorClasses[color] || 'text-indigo-600';

  const renderContent = () => {
    if (section.type === 'experience') {
      return (
        <Reorder.Group axis="y" values={section.content} onReorder={onReorderItem || (() => {})} className="space-y-6">
          {section.content.map((exp: any, i: number) => (
            <Reorder.Item key={exp.id || i} value={exp} className="relative group/preview-item">
              <div className="absolute -left-6 top-0 opacity-0 group-hover/preview-item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-200">
                <GripVertical size={16} />
              </div>
              <div onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.description`, exp.description, 'text')}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-zinc-900" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.position`, exp.position, 'text')}>{exp.position}</h3>
                  <span className="text-sm text-zinc-500 italic">{exp.startDate} - {exp.endDate}</span>
                </div>
                <p 
                  className={cn("font-semibold text-sm mb-2", !section.titleColor && textColor)} 
                  style={section.titleColor ? { color: section.titleColor } : {}}
                  onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.company`, exp.company, 'text')}
                >
                  {exp.company}
                </p>
                <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line">{exp.description}</p>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      );
    }
    if (section.type === 'education') {
      return (
        <Reorder.Group axis="y" values={section.content} onReorder={onReorderItem || (() => {})} className="space-y-4">
          {section.content.map((edu: any, i: number) => (
            <Reorder.Item key={edu.id || i} value={edu} className="relative group/preview-item">
              <div className="absolute -left-6 top-0 opacity-0 group-hover/preview-item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-200">
                <GripVertical size={16} />
              </div>
              <div onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.description`, edu.description, 'text')}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-zinc-900" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.degree`, edu.degree, 'text')}>{edu.degree}</h3>
                  <span className="text-sm text-zinc-500 italic">{edu.startDate} - {edu.endDate}</span>
                </div>
                <p className="text-zinc-600 text-xs font-medium" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.school`, edu.school, 'text')}>{edu.school}</p>
                <p className="text-zinc-700 text-sm mt-1">{edu.description}</p>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      );
    }
    if (section.type === 'list') {
      return (
        <Reorder.Group axis="x" values={section.content} onReorder={onReorderItem || (() => {})} className="flex flex-wrap gap-2">
          {section.content.map((item: any, i: number) => (
            <Reorder.Item key={item.id || i} value={item} className="cursor-grab active:cursor-grabbing">
              <span 
                className="bg-zinc-100 px-2 py-1 rounded text-xs font-bold text-zinc-700 uppercase tracking-wide"
                onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.value`, item.value || item, 'text')}
              >
                {item.value || item}
              </span>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      );
    }
    if (section.type === 'projects') {
      return (
        <Reorder.Group axis="y" values={section.content} onReorder={onReorderItem || (() => {})} className="space-y-4">
          {section.content.map((proj: any, i: number) => (
            <Reorder.Item key={proj.id || i} value={proj} className="relative group/preview-item">
              <div className="absolute -left-6 top-0 opacity-0 group-hover/preview-item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-200">
                <GripVertical size={16} />
              </div>
              <div onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.description`, proj.description, 'text')}>
                <h3 className="font-bold text-zinc-900" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.name`, proj.name, 'text')}>{proj.name}</h3>
                <p className="text-zinc-700 text-sm leading-relaxed">{proj.description}</p>
                {proj.link && (
                  <p 
                    className={cn("text-xs mt-1", !section.titleColor && textColor)} 
                    style={section.titleColor ? { color: section.titleColor } : {}}
                    onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.link`, proj.link, 'text')}
                  >
                    {proj.link}
                  </p>
                )}
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      );
    }
    if (section.type === 'references') {
      return (
        <Reorder.Group axis="y" values={section.content} onReorder={onReorderItem || (() => {})} className="space-y-4">
          {section.content.map((ref: any, i: number) => (
            <Reorder.Item key={ref.id || i} value={ref} className="relative group/preview-item">
              <div className="absolute -left-6 top-0 opacity-0 group-hover/preview-item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-200">
                <GripVertical size={16} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.name`, ref.name, 'text')}>{ref.name}</h3>
                {ref.link && (
                  <a 
                    href={ref.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={cn("text-sm hover:underline", !section.titleColor && textColor)} 
                    style={section.titleColor ? { color: section.titleColor } : {}}
                    onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content.${i}.link`, ref.link, 'text')}
                  >
                    {ref.link}
                  </a>
                )}
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      );
    }
    if (section.type === 'text') {
      return <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line" onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}.content`, section.content, 'text')}>{section.content}</p>;
    }
    return null;
  };

  return (
    <section className={cn(!hideTitle && "mb-8")} style={section.fontSize ? { fontSize: `${section.fontSize}px` } : {}}>
      {!hideTitle && (
        <h2 
          className={cn("text-lg font-bold uppercase tracking-wider mb-4 border-b border-zinc-100 pb-2 cursor-pointer", !section.titleColor && textColor)}
          style={section.titleColor ? { color: section.titleColor, borderColor: section.titleColor } : {}}
          onDoubleClick={(e) => onQuickEdit?.(e, `sections.${sectionIndex}`, section.title, 'section', section.titleColor, undefined, section.fontSize)}
        >
          {section.title}
        </h2>
      )}
      {renderContent()}
    </section>
  );
};

const TemplateModern = ({ 
  data, 
  templateId, 
  onReorder, 
  onReorderItem,
  onQuickEdit 
}: { 
  data: ResumeData; 
  templateId: string; 
  onReorder: (sections: Section[]) => void; 
  onReorderItem: (sIdx: number, items: any[]) => void;
  onQuickEdit: (e: React.MouseEvent, path: string, value: string, type: 'text' | 'section', color?: string, link?: string, fontSize?: number) => void;
}) => {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const colorClasses = {
    indigo: 'border-indigo-600 text-indigo-600',
    zinc: 'border-zinc-600 text-zinc-600',
    slate: 'border-slate-600 text-slate-600',
    emerald: 'border-emerald-600 text-emerald-600',
    stone: 'border-stone-600 text-stone-600',
    violet: 'border-violet-600 text-violet-600',
    black: 'border-black text-black',
    rose: 'border-rose-600 text-rose-600',
    cyan: 'border-cyan-600 text-cyan-600',
    neutral: 'border-neutral-600 text-neutral-600',
    orange: 'border-orange-600 text-orange-600'
  } as any;

  const headerColor = colorClasses[template.color] || 'border-indigo-600 text-indigo-600';

  return (
    <div id="resume-preview" className="bg-white p-12 shadow-2xl min-h-[1122px] w-[794px] mx-auto text-zinc-900 font-sans" style={data.personalInfo.fontSize ? { fontSize: `${data.personalInfo.fontSize}px` } : {}}>
      <header className={cn("border-b-4 pb-6 mb-8", headerColor.split(' ')[0])}>
        <h1 
          className="text-4xl font-black uppercase tracking-tight mb-2 cursor-pointer"
          onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.fullName', data.personalInfo.fullName, 'text', undefined, undefined, data.personalInfo.fontSize)}
        >
          {data.personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 font-medium">
          {data.personalInfo.email && <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.email', data.personalInfo.email, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.email}</span>}
          {data.personalInfo.phone && <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.phone', data.personalInfo.phone, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.phone}</span>}
          {data.personalInfo.location && <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.location', data.personalInfo.location, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.location}</span>}
          {data.personalInfo.website && <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.website', data.personalInfo.website, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.website}</span>}
        </div>
      </header>

      {data.personalInfo.summary && (
        <section className="mb-8">
          <h2 className={cn("text-lg font-bold uppercase tracking-wider mb-3", headerColor.split(' ')[1])}>Professional Summary</h2>
          <p 
            className="text-zinc-700 leading-relaxed cursor-pointer"
            onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.summary', data.personalInfo.summary, 'text', undefined, undefined, data.personalInfo.fontSize)}
          >
            {data.personalInfo.summary}
          </p>
        </section>
      )}

      <Reorder.Group axis="y" values={data.sections} onReorder={onReorder} className="space-y-4">
        {data.sections.map((section, sIdx) => (
          <Reorder.Item key={section.id} value={section} className="relative group/preview-section">
            <div className="absolute -left-8 top-0 opacity-0 group-hover/preview-section:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-300">
              <GripVertical size={20} />
            </div>
            <SectionRenderer 
              section={section} 
              color={template.color} 
              sectionIndex={sIdx}
              onReorderItem={(newVal) => onReorderItem(sIdx, newVal)}
              onQuickEdit={onQuickEdit}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

const TemplateMinimal = ({ 
  data, 
  templateId, 
  onReorder, 
  onReorderItem,
  onQuickEdit 
}: { 
  data: ResumeData; 
  templateId: string; 
  onReorder: (sections: Section[]) => void; 
  onReorderItem: (sIdx: number, items: any[]) => void;
  onQuickEdit: (e: React.MouseEvent, path: string, value: string, type: 'text' | 'section', color?: string, link?: string, fontSize?: number) => void;
}) => {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[1];
  const colorClasses = {
    zinc: 'text-zinc-400 border-zinc-100',
    slate: 'text-slate-400 border-slate-100',
    stone: 'text-stone-400 border-stone-100',
    neutral: 'text-neutral-400 border-neutral-100'
  } as any;

  const accentColor = colorClasses[template.color] || 'text-zinc-400 border-zinc-100';

  return (
    <div id="resume-preview" className="bg-white p-16 shadow-2xl min-h-[1122px] w-[794px] mx-auto text-zinc-900 font-serif" style={data.personalInfo.fontSize ? { fontSize: `${data.personalInfo.fontSize}px` } : {}}>
      <header className="text-center mb-12">
        <h1 
          className="text-5xl font-light mb-4 tracking-tight cursor-pointer"
          onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.fullName', data.personalInfo.fullName, 'text', undefined, undefined, data.personalInfo.fontSize)}
        >
          {data.personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex justify-center gap-4 text-sm text-zinc-500 italic">
          {data.personalInfo.email && <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.email', data.personalInfo.email, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.email}</span>}
          {data.personalInfo.phone && (
            <>
              {data.personalInfo.email && <span>•</span>}
              <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.phone', data.personalInfo.phone, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.phone}</span>
            </>
          )}
          {data.personalInfo.location && (
            <>
              {(data.personalInfo.email || data.personalInfo.phone) && <span>•</span>}
              <span onDoubleClick={(e) => onQuickEdit(e, 'personalInfo.location', data.personalInfo.location, 'text', undefined, undefined, data.personalInfo.fontSize)}>{data.personalInfo.location}</span>
            </>
          )}
        </div>
      </header>

      <Reorder.Group axis="y" values={data.sections} onReorder={onReorder} className="space-y-10">
        {data.sections.map((section, sIdx) => (
          <Reorder.Item key={section.id} value={section} className="relative group/preview-section">
            <div className="absolute -left-8 top-0 opacity-0 group-hover/preview-section:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-300">
              <GripVertical size={20} />
            </div>
            <section>
              <h2 
                className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b pb-2 cursor-pointer", !section.titleColor && accentColor)}
                style={section.titleColor ? { color: section.titleColor, borderColor: section.titleColor } : {}}
                onDoubleClick={(e) => onQuickEdit(e, `sections.${sIdx}`, section.title, 'section', section.titleColor, undefined, section.fontSize)}
              >
                {section.title}
              </h2>
              <div className="mt-4">
                <SectionRenderer 
                  section={section} 
                  color={template.color} 
                  hideTitle 
                  sectionIndex={sIdx}
                  onReorderItem={(newVal) => onReorderItem(sIdx, newVal)}
                  onQuickEdit={onQuickEdit}
                />
              </div>
            </section>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

const Editor = ({ token }: { token: string }) => {
  const { id: resumeId } = useParams();
  const [resume, setResume] = useState<Partial<Resume>>({
    title: 'Untitled Resume',
    templateId: 'modern',
    data: INITIAL_DATA
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (resumeId && resumeId !== 'new') {
      fetchResume();
    } else if (resumeId === 'new') {
      const tId = searchParams.get('template');
      if (tId) {
        setResume(prev => ({ ...prev, templateId: tId }));
      }
    }
  }, [resumeId, searchParams]);

  const fetchResume = async () => {
    const res = await fetch('/api/resumes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const found = data.find((r: Resume) => r.id.toString() === resumeId);
      if (found) setResume(found);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const isNew = resumeId === 'new';
    const url = isNew ? '/api/resumes' : `/api/resumes/${resumeId}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(resume),
    });

    if (res.ok) {
      if (isNew) {
        const data = await res.json();
        navigate(`/editor/${data.id}`);
      }
    }
    setSaving(false);
  };

  const downloadPDF = async () => {
    const element = document.getElementById('resume-preview');
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${resume.title || 'resume'}.pdf`);
  };

  const updateData = (path: string, value: any) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      const parts = path.split('.');
      
      if (parts[0] === 'personalInfo') {
        (newData.personalInfo as any)[parts[1]] = value;
      } else if (parts[0] === 'sections') {
        const sectionIndex = parseInt(parts[1]);
        if (parts.length === 3) {
          (newData.sections[sectionIndex] as any)[parts[2]] = value;
        } else if (parts.length === 4) {
          (newData.sections[sectionIndex].content as any)[parts[3]] = value;
        } else if (parts.length === 5) {
          (newData.sections[sectionIndex].content[parseInt(parts[3])] as any)[parts[4]] = value;
        }
      }
      return { ...prev, data: newData };
    });
  };

  const addSection = (type: Section['type']) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      const id = Math.random().toString(36).substr(2, 9);
      const titles = {
        experience: 'Experience',
        education: 'Education',
        list: 'Skills',
        projects: 'Projects',
        references: 'References',
        text: 'Custom Section'
      } as any;
      newData.sections.push({
        id,
        title: titles[type],
        type,
        content: type === 'list' || type === 'text' ? (type === 'list' ? [] : '') : []
      });
      return { ...prev, data: newData };
    });
  };

  const removeSection = (index: number) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      newData.sections.splice(index, 1);
      return { ...prev, data: newData };
    });
  };

  const addSectionItem = (sectionIndex: number) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      const section = newData.sections[sectionIndex];
      if (section.type === 'experience') {
        section.content.push({ id: Math.random().toString(36).substr(2, 9), company: '', position: '', startDate: '', endDate: '', description: '' });
      } else if (section.type === 'education') {
        section.content.push({ id: Math.random().toString(36).substr(2, 9), school: '', degree: '', startDate: '', endDate: '', description: '' });
      } else if (section.type === 'projects') {
        section.content.push({ id: Math.random().toString(36).substr(2, 9), name: '', description: '', link: '' });
      } else if (section.type === 'references') {
        section.content.push({ id: Math.random().toString(36).substr(2, 9), name: '', link: '' });
      } else if (section.type === 'list') {
        section.content.push({ id: Math.random().toString(36).substr(2, 9), value: '' });
      }
      return { ...prev, data: newData };
    });
  };

  const moveSection = (newSections: Section[]) => {
    setResume(prev => {
      if (!prev.data) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          sections: newSections
        }
      };
    });
  };

  const moveSectionItem = (sectionIndex: number, newContent: any[]) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      newData.sections[sectionIndex].content = newContent;
      return { ...prev, data: newData };
    });
  };

  const removeSectionItem = (sectionIndex: number, itemIndex: number) => {
    setResume(prev => {
      if (!prev.data) return prev;
      const newData = JSON.parse(JSON.stringify(prev.data)) as ResumeData;
      newData.sections[sectionIndex].content.splice(itemIndex, 1);
      return { ...prev, data: newData };
    });
  };

  const correctText = async (path: string, text: string) => {
    if (!text) return;
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Correct and improve the following sentence for a professional resume. Keep it concise and impactful. Only return the corrected text: "${text}"`,
      });
      const corrected = result.text;
      updateData(path, corrected);
    } catch (e) {
      console.error("AI correction failed", e);
    }
  };

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<{ path: string; type: 'text' | 'section'; x: number; y: number; value: string; color?: string; link?: string; fontSize?: number } | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleQuickEdit = (e: React.MouseEvent, path: string, value: string, type: 'text' | 'section', color?: string, link?: string, fontSize?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickEdit({
      path,
      type,
      x: e.clientX,
      y: e.clientY,
      value,
      color,
      link,
      fontSize
    });
    setShowLinkInput(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)] overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-1/3 bg-white border-r border-zinc-200 overflow-y-auto p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 text-sm font-medium">
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={downloadPDF}
              className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-all"
            >
              <Download size={16} />
              PDF
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Resume Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={resume.title}
              onChange={(e) => setResume({ ...resume, title: e.target.value })}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-zinc-200 text-sm"
                  value={resume.data?.personalInfo.fullName}
                  onChange={(e) => updateData('personalInfo.fullName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded border border-zinc-200 text-sm"
                  value={resume.data?.personalInfo.email}
                  onChange={(e) => updateData('personalInfo.email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-zinc-200 text-sm"
                  value={resume.data?.personalInfo.phone}
                  onChange={(e) => updateData('personalInfo.phone', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Summary</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 rounded border border-zinc-200 text-sm resize-none"
                value={resume.data?.personalInfo.summary}
                onChange={(e) => updateData('personalInfo.summary', e.target.value)}
              />
            </div>
          </section>

          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sections</h3>
            <span className="text-[10px] text-zinc-400 italic">Drag to reorder</span>
          </div>
          <Reorder.Group axis="y" values={resume.data?.sections || []} onReorder={moveSection} className="space-y-6">
            {resume.data?.sections.map((section, sIdx) => (
              <Reorder.Item key={section.id} value={section} className="space-y-4 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm relative group/section">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500">
                      <GripVertical size={16} />
                    </div>
                    {editingSectionId === section.id ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <input
                          autoFocus
                          className="text-xs font-bold uppercase tracking-wider text-zinc-900 outline-none border-b border-indigo-500 w-full"
                          value={section.title}
                          onBlur={() => setEditingSectionId(null)}
                          onChange={(e) => updateData(`sections.${sIdx}.title`, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingSectionId(null)}
                        />
                        <div className="flex gap-1">
                          {['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#000000'].map(c => (
                            <button
                              key={c}
                              className="w-4 h-4 rounded-full border border-zinc-200"
                              style={{ backgroundColor: c }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateData(`sections.${sIdx}.titleColor`, c);
                              }}
                            />
                          ))}
                          <button
                            className="text-[10px] text-zinc-400 hover:text-zinc-600"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateData(`sections.${sIdx}.titleColor`, undefined);
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 
                          className="text-xs font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-600"
                          onDoubleClick={() => setEditingSectionId(section.id)}
                        >
                          {section.title}
                        </h3>
                        <button 
                          onClick={() => setEditingSectionId(section.id)}
                          className="text-zinc-300 hover:text-indigo-600 transition-colors"
                        >
                          <Palette size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addSectionItem(sIdx)}
                      className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeSection(sIdx)}
                      className="text-zinc-400 hover:text-red-600 p-1 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {section.type === 'experience' && (
                  <Reorder.Group axis="y" values={section.content} onReorder={(newVal) => moveSectionItem(sIdx, newVal)} className="space-y-3">
                    {section.content.map((exp: any, i: number) => (
                      <Reorder.Item key={i} value={exp} className="p-4 bg-zinc-50 rounded-xl space-y-3 relative group">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} />
                        </div>
                        <button onClick={() => removeSectionItem(sIdx, i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                        <input placeholder="Company" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={exp.company} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.company`, e.target.value)} />
                        <input placeholder="Position" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={exp.position} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.position`, e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={exp.startDate} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.startDate`, e.target.value)} />
                          <input type="date" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={exp.endDate} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.endDate`, e.target.value)} />
                        </div>
                        <div className="relative">
                          <textarea placeholder="Description" rows={3} className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm resize-none pr-8" value={exp.description} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.description`, e.target.value)} />
                          <button onClick={() => correctText(`sections.${sIdx}.content.${i}.description`, exp.description)} className="absolute bottom-2 right-2 text-indigo-600 hover:text-indigo-800" title="AI Correct">
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {section.type === 'education' && (
                  <Reorder.Group axis="y" values={section.content} onReorder={(newVal) => moveSectionItem(sIdx, newVal)} className="space-y-3">
                    {section.content.map((edu: any, i: number) => (
                      <Reorder.Item key={i} value={edu} className="p-4 bg-zinc-50 rounded-xl space-y-3 relative group">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} />
                        </div>
                        <button onClick={() => removeSectionItem(sIdx, i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                        <input placeholder="School" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={edu.school} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.school`, e.target.value)} />
                        <input placeholder="Degree" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={edu.degree} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.degree`, e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={edu.startDate} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.startDate`, e.target.value)} />
                          <input type="date" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={edu.endDate} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.endDate`, e.target.value)} />
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {section.type === 'projects' && (
                  <Reorder.Group axis="y" values={section.content} onReorder={(newVal) => moveSectionItem(sIdx, newVal)} className="space-y-3">
                    {section.content.map((proj: any, i: number) => (
                      <Reorder.Item key={i} value={proj} className="p-4 bg-zinc-50 rounded-xl space-y-3 relative group">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} />
                        </div>
                        <button onClick={() => removeSectionItem(sIdx, i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                        <input placeholder="Project Name" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={proj.name} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.name`, e.target.value)} />
                        <input placeholder="Project Link" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={proj.link} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.link`, e.target.value)} />
                        <div className="relative">
                          <textarea placeholder="Description" rows={3} className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm resize-none pr-8" value={proj.description} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.description`, e.target.value)} />
                          <button onClick={() => correctText(`sections.${sIdx}.content.${i}.description`, proj.description)} className="absolute bottom-2 right-2 text-indigo-600 hover:text-indigo-800" title="AI Correct">
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {section.type === 'references' && (
                  <Reorder.Group axis="y" values={section.content} onReorder={(newVal) => moveSectionItem(sIdx, newVal)} className="space-y-3">
                    {section.content.map((ref: any, i: number) => (
                      <Reorder.Item key={i} value={ref} className="p-4 bg-zinc-50 rounded-xl space-y-3 relative group">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} />
                        </div>
                        <button onClick={() => removeSectionItem(sIdx, i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                        <input placeholder="Reference Name" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={ref.name} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.name`, e.target.value)} />
                        <input placeholder="Reference Link" className="w-full px-3 py-1.5 rounded border border-zinc-200 text-sm" value={ref.link} onChange={(e) => updateData(`sections.${sIdx}.content.${i}.link`, e.target.value)} />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {section.type === 'list' && (
                  <div className="flex flex-wrap gap-2">
                    {section.content.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded">
                        <input className="bg-transparent border-none text-xs font-medium w-20 outline-none" value={item} onChange={(e) => {
                          const newContent = [...section.content];
                          newContent[i] = e.target.value;
                          updateData(`sections.${sIdx}.content`, newContent);
                        }} />
                        <button onClick={() => removeSectionItem(sIdx, i)} className="text-zinc-400 hover:text-red-600">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'text' && (
                  <div className="relative">
                    <textarea rows={4} className="w-full px-3 py-2 rounded border border-zinc-200 text-sm resize-none pr-8" value={section.content} onChange={(e) => updateData(`sections.${sIdx}.content`, e.target.value)} />
                    <button onClick={() => correctText(`sections.${sIdx}.content`, section.content)} className="absolute bottom-2 right-2 text-indigo-600 hover:text-indigo-800" title="AI Correct">
                      <Sparkles size={14} />
                    </button>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <section className="pt-4 border-t border-zinc-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Add Section</label>
            <div className="grid grid-cols-2 gap-2">
              {['experience', 'education', 'list', 'projects', 'references', 'text'].map((type) => (
                <button
                  key={type}
                  onClick={() => addSection(type as any)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 transition-all capitalize"
                >
                  + {type}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-zinc-100 overflow-y-auto p-6 lg:p-12 flex justify-center relative">
        <div 
          className="transform scale-[0.6] sm:scale-[0.75] lg:scale-[0.85] origin-top cursor-default"
        >
          {resume.templateId === 'modern' ? (
            <TemplateModern 
              data={resume.data || INITIAL_DATA} 
              templateId={resume.templateId || 'modern'} 
              onReorder={moveSection}
              onReorderItem={moveSectionItem}
              onQuickEdit={handleQuickEdit}
            />
          ) : (
            <TemplateMinimal 
              data={resume.data || INITIAL_DATA} 
              templateId={resume.templateId || 'minimal'} 
              onReorder={moveSection}
              onReorderItem={moveSectionItem}
              onQuickEdit={handleQuickEdit}
            />
          )}
        </div>

        {/* Quick Edit Menu */}
        <AnimatePresence>
          {quickEdit && (
            <div className="fixed inset-0 z-[60]" onClick={() => setQuickEdit(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{ left: quickEdit.x, top: quickEdit.y }}
                className="absolute bg-white rounded-2xl shadow-2xl border border-zinc-200 p-4 w-72 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Edit</h4>
                  <button onClick={() => setQuickEdit(null)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Text Content</label>
                    <textarea 
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      rows={3}
                      value={quickEdit.value}
                      onChange={(e) => {
                        setQuickEdit({ ...quickEdit, value: e.target.value });
                        updateData(quickEdit.path, e.target.value);
                      }}
                    />
                  </div>

                  {quickEdit.type === 'section' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Section Color</label>
                        <div className="flex flex-wrap gap-2">
                          {['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#000000'].map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                updateData(`${quickEdit.path}.titleColor`, c);
                                setQuickEdit({ ...quickEdit, color: c });
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all",
                                quickEdit.color === c ? "border-zinc-900 scale-110" : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button
                            onClick={() => {
                              updateData(`${quickEdit.path}.titleColor`, undefined);
                              setQuickEdit({ ...quickEdit, color: undefined });
                            }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 underline"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Font Size ({quickEdit.fontSize || 14}px)</label>
                        <input 
                          type="range"
                          min="10"
                          max="32"
                          step="1"
                          className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          value={quickEdit.fontSize || 14}
                          onChange={(e) => {
                            const size = parseInt(e.target.value);
                            updateData(`${quickEdit.path}.fontSize`, size);
                            setQuickEdit({ ...quickEdit, fontSize: size });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {quickEdit.path.startsWith('personalInfo') && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Font Size ({quickEdit.fontSize || 14}px)</label>
                      <input 
                        type="range"
                        min="10"
                        max="48"
                        step="1"
                        className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        value={quickEdit.fontSize || 14}
                        onChange={(e) => {
                          const size = parseInt(e.target.value);
                          updateData(`personalInfo.fontSize`, size);
                          setQuickEdit({ ...quickEdit, fontSize: size });
                        }}
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100">
                    {!showLinkInput ? (
                      <button 
                        onClick={() => setShowLinkInput(true)}
                        className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        <LinkIcon size={14} />
                        {quickEdit.link ? 'Change Link' : 'Add Link'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <input 
                          autoFocus
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 rounded border border-zinc-200 text-xs"
                          value={quickEdit.link || ''}
                          onChange={(e) => {
                            setQuickEdit({ ...quickEdit, link: e.target.value });
                            // If it's a section, we don't usually have a link at the section level in the schema, 
                            // but we can support it if needed. For now, let's assume it's for items.
                            if (quickEdit.path.includes('content')) {
                              updateData(quickEdit.path.replace(/\.[^.]+$/, '.link'), e.target.value);
                            }
                          }}
                        />
                        <button 
                          onClick={() => setShowLinkInput(false)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-800"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const handleAuth = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (loading) return null;

  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
          <Route path="/templates" element={token ? <TemplateSelector /> : <Navigate to="/login" />} />
          <Route path="/login" element={!token ? <AuthForm type="login" onAuth={handleAuth} /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <AuthForm type="register" onAuth={handleAuth} /> : <Navigate to="/" />} />
          <Route path="/editor/:id" element={token ? <Editor token={token} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

