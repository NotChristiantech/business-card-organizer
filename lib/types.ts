export interface ContactFormState {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
}

export const emptyContactForm: ContactFormState = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  notes: '',
};
