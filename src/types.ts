export interface Section {
  id: string;
  title: string;
  type: 'list' | 'text' | 'experience' | 'education' | 'projects' | 'references';
  content: any;
  titleColor?: string;
  fontSize?: number;
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    summary: string;
    fontSize?: number;
  };
  sections: Section[];
}

export interface Resume {
  id: number;
  title: string;
  data: ResumeData;
  templateId: string;
  lastModified: string;
}

export interface User {
  id: number;
  email: string;
}
