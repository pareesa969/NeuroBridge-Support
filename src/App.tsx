import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Plus,
  Heart,
  Brain,
  Shield,
  ArrowRight,
  ChevronRight,
  User,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Mic,
  Send,
  History,
  Download,
  Share2,
  FileJson,
  FileText,
  Clipboard,
  X,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { jsPDF } from 'jspdf';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

interface LocalUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  role: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: string;
}

type View = 'login' | 'register' | 'dashboard' | 'questionnaire' | 'chat' | 'settings' | 'history' | 'scenario';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssessmentAnswer {
  questionId: string;
  question: string;
  answer: string | number;
}

// --- Questions Data ---

const ASSESSMENT_QUESTIONS = [
  {
    id: 'q1',
    section: 'Sustained Attention',
    question: 'When studying, how long can you usually stay focused before your mind drifts?',
    type: 'slider',
    options: ['0–5 min', '5–15 min', '15–30 min', '30+ min'],
    measures: 'Sustained attention'
  },
  {
    id: 'q2',
    section: 'Executive Function',
    question: 'Do you find it hard to start tasks even when you know they’re important?',
    type: 'radio',
    options: ['Almost always', 'Often', 'Sometimes', 'Rarely'],
    measures: 'Task initiation'
  },
  {
    id: 'q3',
    section: 'Distractibility',
    question: 'What usually breaks your concentration the most?',
    type: 'radio',
    options: ['Background noise', 'My own thoughts', 'Phone / notifications', 'Visual clutter', 'I don’t get distracted easily'],
    measures: 'Distractibility type'
  },
  {
    id: 'q4',
    section: 'Learning Style & Processing',
    question: 'You understand something best when it is…',
    type: 'radio',
    options: ['Explained with diagrams or visuals', 'Explained verbally', 'Written step-by-step', 'Shown through examples or practice'],
    measures: 'Primary learning preference'
  },
  {
    id: 'q5',
    section: 'Learning Style & Processing',
    question: 'When given written instructions, how do you usually feel?',
    type: 'radio',
    options: ['Comfortable and clear', 'Okay but slow', 'Easily overwhelmed', 'I prefer someone explaining it'],
    measures: 'Reading load tolerance'
  },
  {
    id: 'q6',
    section: 'Learning Style & Processing',
    question: 'Do you need to re-read information multiple times to understand it?',
    type: 'radio',
    options: ['Yes, almost always', 'Often', 'Sometimes', 'Rarely'],
    measures: 'Processing speed & working memory'
  },
  {
    id: 'q7',
    section: 'Organisation & Memory',
    question: 'How organised do your study materials usually feel?',
    type: 'slider',
    options: ['Very disorganised', 'Somewhat disorganised', 'Neutral', 'Somewhat organised', 'Very organised'],
    measures: 'Organisation skills'
  },
  {
    id: 'q8',
    section: 'Organisation & Memory',
    question: 'Do you forget deadlines or tasks unless you write them down or are reminded?',
    type: 'radio',
    options: ['Almost always', 'Often', 'Sometimes', 'Rarely'],
    measures: 'Prospective memory'
  },
  {
    id: 'q9',
    section: 'Organisation & Memory',
    question: 'Which best describes how you remember information?',
    type: 'radio',
    options: ['I remember visuals', 'I remember explanations', 'I remember by doing', 'I struggle to remember without repetition'],
    measures: 'Memory encoding style'
  },
  {
    id: 'q10',
    section: 'Sensory & Environment Preferences',
    question: 'What study environment works best for you?',
    type: 'radio',
    options: ['Quiet and calm', 'Light background noise', 'Music', 'Flexible / doesn’t matter'],
    measures: 'Sensory comfort'
  },
  {
    id: 'q11',
    section: 'Sensory & Environment Preferences',
    question: 'Bright lights, noise, or clutter make studying…',
    type: 'radio',
    options: ['Very difficult', 'Somewhat harder', 'No difference', 'Easier (I like stimulation)'],
    measures: 'Sensory sensitivity'
  },
  {
    id: 'q12',
    section: 'Emotional Response to Learning',
    question: 'How do you usually feel when faced with a difficult academic task?',
    type: 'radio',
    options: ['Anxious or overwhelmed', 'Avoidant / procrastinating', 'Motivated to try', 'Neutral'],
    measures: 'Academic emotional response'
  },
  {
    id: 'q13',
    section: 'Emotional Response to Learning',
    question: 'Do you perform better when tasks are broken into smaller steps?',
    type: 'radio',
    options: ['Yes, definitely', 'Sometimes', 'Not really'],
    measures: 'Cognitive load tolerance'
  },
  {
    id: 'q14',
    section: 'Self-Awareness & Preferences',
    question: 'Do you feel traditional teaching methods fully work for you?',
    type: 'radio',
    options: ['Yes', 'Sometimes', 'Not really', 'No'],
    measures: 'Perceived fit with standard education'
  },
  {
    id: 'q15',
    section: 'Self-Awareness & Preferences',
    question: 'Would you prefer learning tools that adapt to your pace and style?',
    type: 'radio',
    options: ['Yes', 'Maybe', 'No preference'],
    measures: 'Readiness for adaptive learning'
  }
];

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'panic' }) => {
  const variants = {
    primary: 'luminous-button text-on-primary font-semibold hover:opacity-90 transition-all',
    secondary: 'bg-secondary-container text-on-secondary-container font-medium hover:bg-opacity-80 transition-all',
    ghost: 'hover:bg-white/5 text-on-surface-variant transition-all',
    outline: 'border border-outline text-on-surface hover:bg-white/5 transition-all',
    panic: 'bg-error text-on-error font-bold hover:bg-error/90 transition-all shadow-[0_0_20px_rgba(255,180,171,0.3)]'
  };

  return (
    <button 
      className={cn(
        'px-6 py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, glow = false, ...props }: { children: React.ReactNode, className?: string, glow?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      'glass-card rounded-[32px] border border-white/10 overflow-hidden',
      glow && 'luminous-glow',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const Input = ({ icon: Icon, label, ...props }: any) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-sm font-medium text-on-surface-variant ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />}
      <input 
        className={cn(
          "w-full bg-surface-container-low border border-outline-variant rounded-2xl py-3.5 px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface",
          Icon && "pl-12"
        )}
        {...props}
      />
    </div>
  </div>
);

// --- Views ---

const LoginView = ({ onNavigate }: { onNavigate: (v: View) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    setTimeout(() => {
      try {
        const users = JSON.parse(localStorage.getItem('neurobridge_users') || localStorage.getItem('sanctuary_users') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        
        if (user) {
          const localUser: LocalUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            role: user.role
          };
          localStorage.setItem('neurobridge_current_user', JSON.stringify(localUser));
          window.dispatchEvent(new Event('storage')); // Trigger update
          onNavigate('dashboard');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } catch (err) {
        setError('An error occurred during login.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-container mb-6 luminous-shadow">
            <Shield className="w-8 h-8 text-on-primary-container" />
          </div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface mb-3 tracking-tight">NeuroBridge Support</h1>
          <p className="text-on-surface-variant font-medium">Neuro-Support AI for Every Family</p>
        </div>

        <Card className="p-8 space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-4">
              <Input 
                icon={Mail} 
                type="email" 
                placeholder="Email address" 
                label="Email" 
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                required
              />
              <Input 
                icon={Lock} 
                type="password" 
                placeholder="Password" 
                label="Password" 
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary" />
                <span className="text-on-surface-variant">Remember me</span>
              </label>
              <button type="button" className="text-primary font-semibold hover:underline">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full py-4" disabled={loading}>
              {loading ? 'Logging in...' : 'Login to NeuroBridge Support'}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-8 text-on-surface-variant">
          New to NeuroBridge Support? <button onClick={() => onNavigate('register')} className="text-primary font-bold hover:underline">Create an account</button>
        </p>
      </motion.div>
    </div>
  );
};

const RegisterView = ({ onNavigate, onRegister }: { onNavigate: (v: View) => void, onRegister: (name: string, email: string) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    
    setTimeout(() => {
      try {
        const users = JSON.parse(localStorage.getItem('neurobridge_users') || localStorage.getItem('sanctuary_users') || '[]');
        
        if (users.some((u: any) => u.email === email)) {
          setError('This email is already registered.');
          setLoading(false);
          return;
        }

        const newUser = {
          uid: Math.random().toString(36).substring(2, 15),
          displayName: name,
          email: email,
          password: password, // In a real app, this would be hashed
          role: 'user',
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('neurobridge_users', JSON.stringify(users));
        
        const localUser: LocalUser = {
          uid: newUser.uid,
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role
        };
        localStorage.setItem('neurobridge_current_user', JSON.stringify(localUser));
        window.dispatchEvent(new Event('storage'));

        onRegister(name, email);
        onNavigate('questionnaire');
      } catch (err) {
        setError('An error occurred during registration.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-headline font-extrabold text-on-surface mb-3 tracking-tight">Join NeuroBridge Support</h1>
          <p className="text-on-surface-variant font-medium">Start your journey to family balance</p>
        </div>

        <Card className="p-8 space-y-6">
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input 
                icon={User} 
                type="text" 
                placeholder="Full name" 
                label="Full Name" 
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                required
              />
              <Input 
                icon={Mail} 
                type="email" 
                placeholder="Email address" 
                label="Email" 
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                required
              />
              <Input 
                icon={Lock} 
                type="password" 
                placeholder="Create password" 
                label="Password" 
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="p-4 bg-error-container/20 rounded-2xl border border-error/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div className="text-xs text-on-error-container leading-relaxed">
                <strong>Medical Disclaimer:</strong> NeuroBridge Support is an AI support tool and not a replacement for professional medical advice, diagnosis, or treatment.
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" required className="mt-1 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary" />
              <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">
                I understand the medical disclaimer and agree to the Terms of Service and Privacy Policy.
              </span>
            </label>

            <Button type="submit" className="w-full py-4" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-8 text-on-surface-variant">
          Already have an account? <button onClick={() => onNavigate('login')} className="text-primary font-bold hover:underline">Log in</button>
        </p>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ active, onNavigate }: { active: View, onNavigate: (v: View) => void }) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'chat', icon: MessageSquare, label: 'AI Guide' },
    { id: 'questionnaire', icon: BookOpen, label: 'Assessments' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-72 h-screen flex flex-col border-r border-outline-variant bg-surface-container-lowest z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
            <Shield className="w-6 h-6 text-on-primary-container" />
          </div>
          <span className="font-headline font-bold text-lg tracking-tight">NeuroBridge Support</span>
        </div>

        <nav className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as View)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-medium",
                active === item.id 
                  ? "bg-primary-container text-on-primary-container shadow-lg shadow-primary/10" 
                  : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 space-y-6">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <Heart className="w-5 h-5 text-on-secondary-container" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Pro Plan</p>
              <p className="text-[10px] text-on-surface-variant">Family Support</p>
            </div>
          </div>
          <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-3/4" />
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">12/15 sessions used</p>
        </div>

        <button 
          onClick={() => {
            localStorage.removeItem('neurobridge_current_user');
            window.dispatchEvent(new Event('storage'));
            onNavigate('login');
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-error hover:bg-error/10 transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

const DashboardView = ({ onNavigate, userName, assessmentAnswers }: { onNavigate: (v: View) => void, userName: string, assessmentAnswers: AssessmentAnswer[] }) => {
  const actions = [
    "Meltdown Support", "Bedtime Routine", "Social Stories", "Sensory Overload", "Communication Tips"
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('NeuroBridge Support Profile', margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.text(`User: ${userName}`, margin, y);
    y += 10;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 20;

    doc.setFontSize(16);
    doc.setTextColor(100, 100, 255);
    doc.text('Assessment Results', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    assessmentAnswers.forEach((ans, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const questionText = doc.splitTextToSize(`${i + 1}. ${ans.question}`, 170);
      doc.setFont("helvetica", "bold");
      doc.text(questionText, margin, y);
      y += (questionText.length * 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Answer: ${ans.answer}`, margin + 5, y);
      y += 10;
    });

    doc.save(`${userName.replace(/\s+/g, '_')}_NeuroBridge_Support_Profile.pdf`);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar p-10 space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-2">Welcome back, {userName || 'Friend'}</h2>
          <p className="text-on-surface-variant font-medium">Your NeuroBridge Support is ready to support you today.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface transition-all">
            <Search className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface transition-all relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface-container" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-primary-container border-2 border-primary/20 overflow-hidden">
            <img src="https://picsum.photos/seed/sarah/100/100" alt="Profile" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {actions.map((action) => (
            <button key={action} className="px-5 py-2.5 rounded-full bg-surface-container border border-outline-variant text-sm font-semibold whitespace-nowrap hover:border-primary transition-all">
              {action}
            </button>
          ))}
          <button className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Custom
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <Card className="col-span-8 p-8 relative group cursor-pointer" glow>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-on-primary-container" />
              </div>
              <h3 className="text-3xl font-headline font-bold mb-3">AI Guide Support</h3>
              <p className="text-on-surface-variant max-w-md mb-8 leading-relaxed">
                Get immediate, compassionate guidance for any situation. Our AI is trained on neuro-affirming practices.
              </p>
              <Button onClick={() => onNavigate('chat')}>Start Conversation <ArrowRight className="w-5 h-5" /></Button>
            </div>
          </Card>

          <Card className="col-span-4 p-8 bg-secondary-container/10 border-secondary/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline font-bold text-xl">NeuroBridge Support Pulse</h3>
              <Heart className="w-6 h-6 text-secondary" />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-on-surface-variant">Family Calmness</span>
                <span className="text-secondary">82%</span>
              </div>
              <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '82%' }}
                  className="h-full bg-secondary rounded-full" 
                />
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your family's emotional baseline is stable today. Great job maintaining the routine!
              </p>
            </div>
          </Card>

          <div className="col-span-12 grid grid-cols-3 gap-6">
            <Card 
              onClick={() => onNavigate('scenario')}
              className="p-6 hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary-container transition-all">
                <BookOpen className="w-6 h-6 text-on-surface-variant group-hover:text-on-primary-container" />
              </div>
              <h4 className="font-bold mb-2">Start Scenario</h4>
              <p className="text-xs text-on-surface-variant">Practice transitions or social situations in a safe space.</p>
            </Card>
            <Card 
              onClick={() => onNavigate('history')}
              className="p-6 hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary-container transition-all">
                <History className="w-6 h-6 text-on-surface-variant group-hover:text-on-primary-container" />
              </div>
              <h4 className="font-bold mb-2">History</h4>
              <p className="text-xs text-on-surface-variant">Review past support strategies and what worked best.</p>
            </Card>
            <Card 
              onClick={downloadPDF}
              className="p-6 hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary-container transition-all">
                <Share2 className="w-6 h-6 text-on-surface-variant group-hover:text-on-primary-container" />
              </div>
              <h4 className="font-bold mb-2">Export Profile</h4>
              <p className="text-xs text-on-surface-variant">Share your child's support needs with teachers or caregivers.</p>
            </Card>
          </div>
        </div>
      </section>

      <button className="fixed bottom-10 right-10 w-20 h-20 rounded-full bg-error text-on-error flex items-center justify-center shadow-2xl shadow-error/40 hover:scale-110 transition-all z-50 group">
        <AlertCircle className="w-10 h-10 group-hover:animate-pulse" />
        <span className="absolute -top-12 right-0 bg-error text-on-error px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
          Panic Button
        </span>
      </button>
    </div>
  );
};

const QuestionnaireView = ({ onNavigate, onComplete }: { onNavigate: (v: View) => void, onComplete: (answers: AssessmentAnswer[]) => void }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const currentQuestion = ASSESSMENT_QUESTIONS[currentQuestionIndex];
  const totalQuestions = ASSESSMENT_QUESTIONS.length;

  const handleAnswer = (value: string | number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const generateSuggestions = async (formattedAnswers: AssessmentAnswer[]) => {
    setIsGenerating(true);
    setShowSuggestions(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these assessment results for a neurodivergent child's support profile, provide 4-5 immediate, practical, and neuro-affirming suggestions for the parents. 
        Results: ${JSON.stringify(formattedAnswers)}
        Format the response as a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const data = JSON.parse(response.text);
      setSuggestions(data);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions([
        "Establish a predictable daily routine with visual supports.",
        "Create a 'sensory sanctuary' or quiet corner for regulation.",
        "Use 'First-Then' boards to help with transitions between tasks.",
        "Break down complex instructions into single, manageable steps.",
        "Incorporate movement breaks or heavy work activities throughout the day."
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      const formattedAnswers = ASSESSMENT_QUESTIONS.map(q => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || ''
      }));
      onComplete(formattedAnswers);
      await generateSuggestions(formattedAnswers);
    }
  };

  const handleBack = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      onNavigate('register');
    }
  };

  if (showSuggestions) {
    return (
      <div className="flex-1 h-screen flex flex-col p-10 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="max-w-3xl mx-auto w-full z-10 flex flex-col h-full justify-center">
          <Card className="p-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl font-headline font-extrabold tracking-tight">Assessment Complete!</h2>
              <p className="text-on-surface-variant text-lg">Based on your answers, here are some initial suggestions for your NeuroBridge Support:</p>
            </div>

            {isGenerating ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-primary font-bold animate-pulse">Generating personalized suggestions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestions.map((s, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-5 rounded-2xl bg-surface-container border border-outline-variant flex gap-4 items-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-primary font-bold">{i + 1}</span>
                    </div>
                    <p className="font-medium text-on-surface leading-relaxed">{s}</p>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="pt-6">
              <Button className="w-full py-4 text-lg" onClick={() => onNavigate('dashboard')} disabled={isGenerating}>
                Go to Dashboard <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen flex flex-col p-10 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
      
      <div className="max-w-3xl mx-auto w-full z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-12">
          <button onClick={handleBack} className="text-on-surface-variant hover:text-on-surface flex items-center gap-2 font-bold">
            <ChevronLeft className="w-5 h-5" /> {currentQuestionIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-on-surface-variant">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <div className="w-48 h-2 bg-surface-container rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                className="h-full bg-primary rounded-full" 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-2">{currentQuestion.section}</p>
                <h2 className="text-3xl font-headline font-extrabold mb-4">{currentQuestion.question}</h2>
                <p className="text-on-surface-variant text-sm italic">Measures: {currentQuestion.measures}</p>
              </div>

              <div className="space-y-4">
                {currentQuestion.type === 'radio' && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option) => (
                      <button 
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className={cn(
                          "w-full p-5 rounded-2xl border transition-all text-left flex items-center justify-between group",
                          answers[currentQuestion.id] === option 
                            ? "bg-primary/10 border-primary text-on-surface" 
                            : "bg-surface-container border-outline-variant hover:border-primary/50"
                        )}
                      >
                        <span className="font-bold">{option}</span>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          answers[currentQuestion.id] === option ? "border-primary bg-primary" : "border-outline-variant"
                        )}>
                          {answers[currentQuestion.id] === option && <CheckCircle2 className="w-4 h-4 text-on-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'slider' && (
                  <div className="space-y-10 py-10">
                    <div className="relative">
                      <input 
                        type="range" 
                        min="0" 
                        max={currentQuestion.options.length - 1} 
                        step="1"
                        value={currentQuestion.options.indexOf(answers[currentQuestion.id] as string) === -1 ? 0 : currentQuestion.options.indexOf(answers[currentQuestion.id] as string)}
                        onChange={(e) => handleAnswer(currentQuestion.options[parseInt(e.target.value)])}
                        className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between mt-4">
                        {currentQuestion.options.map((opt, i) => (
                          <span key={opt} className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            answers[currentQuestion.id] === opt ? "text-primary" : "text-outline"
                          )}>
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-center p-6 rounded-3xl bg-primary/5 border border-primary/20">
                      <p className="text-sm text-on-surface-variant mb-1">Selected Answer:</p>
                      <p className="text-2xl font-bold text-primary">{answers[currentQuestion.id] || currentQuestion.options[0]}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-8">
                <Button 
                  className="w-full max-w-md py-4" 
                  onClick={handleNext}
                  disabled={!answers[currentQuestion.id] && currentQuestion.type === 'radio'}
                >
                  {currentQuestionIndex === totalQuestions - 1 ? 'Complete Assessment' : 'Next Question'} <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ChatView = ({ 
  userName, 
  assessmentAnswers, 
  sessions, 
  setSessions, 
  currentSessionId, 
  setCurrentSessionId 
}: { 
  userName: string, 
  assessmentAnswers: AssessmentAnswer[],
  sessions: ChatSession[],
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>,
  currentSessionId: string | null,
  setCurrentSessionId: (id: string | null) => void
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Session",
      messages: [
        { id: '1', role: 'assistant', content: `Hello ${userName || 'Sarah'}. I'm here to support you. How can I help you today?`, timestamp: new Date() }
      ],
      timestamp: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  // Initialize first session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !currentSessionId) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    
    // Update local state immediately
    const updatedMessages = [...messages, userMsg];
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages, timestamp: new Date().toISOString() } : s));
    
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Please add it in the Settings > Secrets menu.');
      }
      const genAI = new GoogleGenAI({ apiKey });
      const model = await genAI.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{
              text: `Context: User is ${userName}. Assessment answers: ${JSON.stringify(assessmentAnswers)}. 
              Previous messages: ${updatedMessages.map(m => `${m.role}: ${m.content}`).join('\n')}.
              User message: ${input}`
            }]
          }
        ],
        config: {
          systemInstruction: "You are NeuroBridge Support Guide, a compassionate AI support tool for families with neurodivergent children. Your goal is to provide neuro-affirming guidance, practical strategies, and emotional support. Use the user's assessment data to personalize your responses. Be concise, empathetic, and always include a medical disclaimer when appropriate. Never give medical diagnoses."
        }
      });

      let fullResponse = "";
      const aiMsgId = (Date.now() + 1).toString();
      
      // Add placeholder message
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
        ...s, 
        messages: [...updatedMessages, { id: aiMsgId, role: 'assistant', content: "", timestamp: new Date() }] 
      } : s));

      for await (const chunk of model) {
        const text = chunk.text;
        fullResponse += text;
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullResponse } : m)
        } : s));
      }

      // Update title if it's still "New Session"
      if (currentSession?.title === "New Session") {
        try {
          const titleResult = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Summarize this conversation into a concise 3-5 word title. Do not use quotes or special characters.
            User: ${input}
            Assistant: ${fullResponse}`
          });
          const newTitle = titleResult.text.trim().replace(/^["']|["']$/g, '');
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: newTitle } : s));
        } catch (e) {
          console.error("Title generation error:", e);
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: input.substring(0, 30) + (input.length > 30 ? "..." : "") } : s));
        }
      }

    } catch (error) {
      console.error("AI Error:", error);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        messages: [...s.messages, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", 
          timestamp: new Date() 
        }]
      } : s));
    } finally {
      setIsTyping(false);
    }
  };

  const downloadChat = () => {
    if (!currentSession) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text(`Chat Session: ${currentSession.title}`, 20, y);
    y += 15;
    doc.setFontSize(10);
    currentSession.messages.forEach(m => {
      if (y > 270) { doc.addPage(); y = 20; }
      const text = doc.splitTextToSize(`${m.role.toUpperCase()}: ${m.content}`, 170);
      doc.text(text, 20, y);
      y += (text.length * 5) + 5;
    });
    doc.save(`Chat_${currentSession.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex-1 h-screen flex">
      {/* Sessions Sidebar */}
      <div className="w-80 border-r border-outline-variant bg-surface-container-low flex flex-col">
        <div className="p-6 border-b border-outline-variant">
          <Button onClick={createNewSession} variant="outline" className="w-full justify-start gap-3">
            <Plus className="w-5 h-5" /> New Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <p className="text-[10px] font-bold text-outline uppercase tracking-widest px-2 mb-2">Recent Sessions</p>
          {sessions.map((session) => (
            <button 
              key={session.id} 
              onClick={() => setCurrentSessionId(session.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl text-sm font-medium transition-all truncate",
                currentSessionId === session.id ? "bg-surface-container-highest text-on-surface shadow-sm" : "text-on-surface-variant hover:bg-white/5"
              )}
            >
              {session.title}
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-10 italic">No sessions yet.</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        <header className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <Shield className="w-6 h-6 text-on-primary-container" />
            </div>
            <div>
              <h3 className="font-bold">{currentSession?.title || "NeuroBridge Support Guide"}</h3>
              <p className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" /> Active Support
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant transition-all"><Share2 className="w-5 h-5" /></button>
            <button onClick={downloadChat} className="p-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant transition-all"><Download className="w-5 h-5" /></button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] p-5 rounded-3xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-primary text-on-primary rounded-tr-none" 
                  : "bg-surface-container-highest text-on-surface rounded-tl-none border border-outline-variant"
              )}>
                {msg.content}
                <p className={cn(
                  "text-[10px] mt-2 opacity-60",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-surface-container-highest p-5 rounded-3xl rounded-tl-none border border-outline-variant flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-8 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute -top-12 left-0 flex gap-2">
              <button 
                onClick={() => setInput("Can you suggest a calming routine for bedtime?")}
                className="px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant text-[10px] font-bold hover:border-primary transition-all"
              >
                Suggest routine
              </button>
              <button 
                onClick={() => setInput("What are some effective calming techniques for sensory overload?")}
                className="px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant text-[10px] font-bold hover:border-primary transition-all"
              >
                Calming techniques
              </button>
            </div>
            
            <div className="flex items-end gap-4">
              <button className="p-4 rounded-2xl bg-error/10 text-error hover:bg-error/20 transition-all border border-error/20">
                <AlertCircle className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type your message..."
                  className="w-full bg-surface-container border border-outline-variant rounded-3xl py-4 pl-6 pr-14 outline-none focus:border-primary transition-all text-on-surface resize-none h-14 max-h-40"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-3 bottom-3 p-2 rounded-xl bg-primary text-on-primary hover:opacity-90 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button className="p-4 rounded-2xl bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface transition-all">
                <Mic className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryView = ({ onNavigate, sessions, assessmentAnswers }: { onNavigate: (v: View) => void, sessions: ChatSession[], assessmentAnswers: AssessmentAnswer[] }) => {
  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar p-10 space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <button onClick={() => onNavigate('dashboard')} className="text-on-surface-variant hover:text-on-surface flex items-center gap-2 font-bold mb-4">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-2">NeuroBridge Support History</h2>
          <p className="text-on-surface-variant font-medium">Review your past assessments and support conversations.</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" /> Past Conversations
          </h3>
          <div className="grid grid-cols-3 gap-6">
            {sessions.map(session => (
              <div key={session.id}>
                <Card 
                  onClick={() => {
                    onNavigate('chat');
                  }}
                  className="p-6 hover:border-primary/40 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center group-hover:bg-primary-container transition-all">
                      <MessageSquare className="w-5 h-5 text-on-surface-variant group-hover:text-on-primary-container" />
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-bold">{new Date(session.timestamp).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold mb-2 truncate">{session.title}</h4>
                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {session.messages[session.messages.length - 1]?.content || "No messages"}
                  </p>
                </Card>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="col-span-3 py-12 text-center bg-surface-container rounded-3xl border border-outline-variant">
                <p className="text-on-surface-variant italic">No chat history found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Clipboard className="w-6 h-6 text-primary" /> Assessment History
          </h3>
          {assessmentAnswers.length > 0 ? (
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-lg">Latest Assessment</h4>
                  <p className="text-xs text-on-surface-variant">Completed on {new Date().toLocaleDateString()}</p>
                </div>
                <Button variant="outline" onClick={() => onNavigate('questionnaire')}>Retake Assessment</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {assessmentAnswers.slice(0, 6).map((ans, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">{ans.questionId}</p>
                    <p className="text-sm font-medium truncate">{ans.question}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{ans.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="py-12 text-center bg-surface-container rounded-3xl border border-outline-variant">
              <p className="text-on-surface-variant italic">No assessment history found.</p>
              <Button variant="outline" className="mt-4" onClick={() => onNavigate('questionnaire')}>Take Assessment</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScenarioView = ({ onNavigate, userName, assessmentAnswers }: { onNavigate: (v: View) => void, userName: string, assessmentAnswers: AssessmentAnswer[] }) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  
  const scenarios = [
    { id: '1', title: 'The Grocery Store', description: 'Practice managing sensory overload in a busy environment.', icon: Search },
    { id: '2', title: 'Bedtime Transition', description: 'Practice a smooth transition from play to sleep.', icon: Bell },
    { id: '3', title: 'New Social Interaction', description: 'Practice meeting a new peer at the park.', icon: User },
    { id: '4', title: 'Unexpected Change', description: 'Practice handling a change in the daily schedule.', icon: AlertCircle },
  ];

  if (activeScenario) {
    return (
      <div className="flex-1 h-screen flex flex-col bg-background">
        <header className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveScenario(null)} className="p-2 rounded-xl hover:bg-white/5">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h3 className="font-bold text-xl">{scenarios.find(s => s.id === activeScenario)?.title}</h3>
          </div>
          <Button variant="panic" onClick={() => setActiveScenario(null)}>End Scenario</Button>
        </header>
        <div className="flex-1 flex items-center justify-center p-10">
          <Card className="max-w-2xl w-full p-10 text-center space-y-8" glow>
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-headline font-bold">Scenario Simulation</h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              This feature will use AI to simulate a real-world situation where you can practice neuro-affirming responses. 
              The simulation for <strong>{scenarios.find(s => s.id === activeScenario)?.title}</strong> is being prepared.
            </p>
            <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant text-left space-y-4">
              <p className="font-bold text-primary flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Setting the Scene</p>
              <p className="text-sm">You are at the {scenarios.find(s => s.id === activeScenario)?.title.toLowerCase()}. Your child is starting to feel overwhelmed by the noise...</p>
            </div>
            <Button className="w-full py-4" onClick={() => onNavigate('chat')}>Continue in Chat Guide</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar p-10 space-y-10">
      <header>
        <button onClick={() => onNavigate('dashboard')} className="text-on-surface-variant hover:text-on-surface flex items-center gap-2 font-bold mb-4">
          <ChevronLeft className="w-5 h-5" /> Back to Dashboard
        </button>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-2">Scenario Practice</h2>
        <p className="text-on-surface-variant font-medium">Safe spaces to practice support strategies for common challenges.</p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        {scenarios.map(s => (
          <div key={s.id}>
            <Card 
              onClick={() => setActiveScenario(s.id)}
              className="p-8 hover:border-primary/40 transition-all cursor-pointer group flex gap-6 items-start"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center group-hover:bg-primary-container transition-all shrink-0">
                <s.icon className="w-8 h-8 text-on-surface-variant group-hover:text-on-primary-container" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{s.description}</p>
                <div className="mt-4 flex items-center gap-2 text-primary font-bold text-sm">
                  Start Simulation <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsView = ({ userName, userEmail, assessmentAnswers }: { userName: string, userEmail: string, assessmentAnswers: AssessmentAnswer[] }) => {
  const [showExport, setShowExport] = useState(false);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('NeuroBridge Support Profile', margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.text(`User: ${userName}`, margin, y);
    y += 10;
    doc.text(`Email: ${userEmail}`, margin, y);
    y += 10;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 20;

    doc.setFontSize(16);
    doc.setTextColor(100, 100, 255);
    doc.text('Assessment Results', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    assessmentAnswers.forEach((ans, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const questionText = doc.splitTextToSize(`${i + 1}. ${ans.question}`, 170);
      doc.setFont("helvetica", "bold");
      doc.text(questionText, margin, y);
      y += (questionText.length * 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Answer: ${ans.answer}`, margin + 5, y);
      y += 10;
    });

    doc.save(`${userName.replace(/\s+/g, '_')}_NeuroBridge_Support_Profile.pdf`);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar p-10 space-y-10">
      <header>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-2">Settings & Profile</h2>
        <p className="text-on-surface-variant font-medium">Manage your NeuroBridge Support and view your assessment data.</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-8">
          <Card className="p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <User className="w-6 h-6 text-primary" /> Profile Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <Input label="Full Name" defaultValue={userName} readOnly />
              <Input label="Email Address" defaultValue={userEmail} readOnly />
            </div>
          </Card>

          <Card className="p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Clipboard className="w-6 h-6 text-primary" /> Assessment Data
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {assessmentAnswers.length > 0 ? (
                assessmentAnswers.map((ans, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
                    <p className="text-xs font-bold text-primary mb-1">Question {i + 1}</p>
                    <p className="text-sm font-medium mb-2">{ans.question}</p>
                    <p className="text-sm text-on-surface-variant bg-surface-container p-3 rounded-xl border border-outline-variant/50">
                      {ans.answer}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-on-surface-variant italic">No assessment data found. Please complete the assessment.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-4 space-y-8">
          <Card className="p-8 space-y-6 bg-primary-container/10 border-primary/20">
            <h3 className="text-xl font-bold">Data Export</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Export your support profiles, chat history, and strategies to share with professionals.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={downloadPDF}>
                <Download className="w-5 h-5" /> Download PDF Profile
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowExport(true)}>
                <Share2 className="w-5 h-5" /> Share Profile
              </Button>
            </div>
          </Card>

          <Card className="p-8 space-y-6 border-error/20">
            <h3 className="text-xl font-bold text-error">Danger Zone</h3>
            <p className="text-sm text-on-surface-variant">
              Permanently delete your account and all associated data.
            </p>
            <Button variant="panic" className="w-full bg-error/10 text-error hover:bg-error border border-error/20">
              Delete Account
            </Button>
          </Card>
        </div>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExport(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md z-10"
            >
              <Card className="p-8 space-y-8" glow>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-headline font-bold">Export Options</h3>
                  <button onClick={() => setShowExport(false)} className="p-2 rounded-xl hover:bg-white/5 text-on-surface-variant">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <button className="w-full p-6 rounded-3xl bg-surface-container border border-outline-variant hover:border-primary transition-all flex items-center gap-6 text-left group">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center group-hover:bg-primary-container transition-all">
                      <FileText className="w-8 h-8 text-on-surface-variant group-hover:text-on-primary-container" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">PDF Document</p>
                      <p className="text-sm text-on-surface-variant">Best for printing and sharing with teachers.</p>
                    </div>
                  </button>

                  <button className="w-full p-6 rounded-3xl bg-surface-container border border-outline-variant hover:border-primary transition-all flex items-center gap-6 text-left group">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center group-hover:bg-primary-container transition-all">
                      <FileJson className="w-8 h-8 text-on-surface-variant group-hover:text-on-primary-container" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">JSON Data</p>
                      <p className="text-sm text-on-surface-variant">Raw data for importing into other tools.</p>
                    </div>
                  </button>

                  <button className="w-full p-6 rounded-3xl bg-surface-container border border-outline-variant hover:border-primary transition-all flex items-center gap-6 text-left group">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center group-hover:bg-primary-container transition-all">
                      <Clipboard className="w-8 h-8 text-on-surface-variant group-hover:text-on-primary-container" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Copy to Clipboard</p>
                      <p className="text-sm text-on-surface-variant">Quickly copy a summary of your profile.</p>
                    </div>
                  </button>
                </div>

                <Button className="w-full py-4" onClick={() => setShowExport(false)}>
                  Close
                </Button>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<LocalUser | null>(null);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('neurobridge_user_name') || localStorage.getItem('sanctuary_user_name') || '');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('neurobridge_user_email') || localStorage.getItem('sanctuary_user_email') || '');
  const [assessmentAnswers, setAssessmentAnswers] = useState<AssessmentAnswer[]>(() => {
    const saved = localStorage.getItem('neurobridge_assessment') || localStorage.getItem('sanctuary_assessment');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('neurobridge_sessions') || localStorage.getItem('sanctuary_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('neurobridge_current_session_id') || localStorage.getItem('sanctuary_current_session_id');
    return saved || null;
  });

  useEffect(() => {
    localStorage.setItem('neurobridge_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('neurobridge_current_session_id', currentSessionId);
    } else {
      localStorage.removeItem('neurobridge_current_session_id');
    }
  }, [currentSessionId]);

  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('neurobridge_current_user') || localStorage.getItem('sanctuary_current_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setUserEmail(parsedUser.email);
        setUserName(parsedUser.displayName);
        
        if (view === 'login' || view === 'register') {
          setView('dashboard');
        }
      } else {
        setUser(null);
        if (!['login', 'register'].includes(view)) {
          setView('login');
        }
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [view]);

  const handleRegister = (name: string, email: string) => {
    setUserName(name);
    setUserEmail(email);
  };

  const handleAssessmentComplete = (answers: AssessmentAnswer[]) => {
    setAssessmentAnswers(answers);
    localStorage.setItem('neurobridge_assessment', JSON.stringify(answers));
  };

  const renderView = () => {
    switch (view) {
      case 'login': return <LoginView onNavigate={setView} />;
      case 'register': return <RegisterView onNavigate={setView} onRegister={handleRegister} />;
      case 'dashboard': return <DashboardView onNavigate={setView} userName={userName} assessmentAnswers={assessmentAnswers} />;
      case 'questionnaire': return <QuestionnaireView onNavigate={setView} onComplete={handleAssessmentComplete} />;
      case 'chat': return (
        <ChatView 
          userName={userName} 
          assessmentAnswers={assessmentAnswers} 
          sessions={sessions}
          setSessions={setSessions}
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
        />
      );
      case 'settings': return <SettingsView userName={userName} userEmail={userEmail} assessmentAnswers={assessmentAnswers} />;
      case 'history': return <HistoryView onNavigate={setView} sessions={sessions} assessmentAnswers={assessmentAnswers} />;
      case 'scenario': return <ScenarioView onNavigate={setView} userName={userName} assessmentAnswers={assessmentAnswers} />;
      default: return <LoginView onNavigate={setView} />;
    }
  };

  const showSidebar = !['login', 'register', 'questionnaire', 'scenario'].includes(view);

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body selection:bg-primary/30">
      {showSidebar && <Sidebar active={view} onNavigate={setView} />}
      <main className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
