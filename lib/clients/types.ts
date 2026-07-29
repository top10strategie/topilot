export type ClientCategoryItem = {
  id: string;
  label: string;
};

export type ClientResponsibleItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
};

export type ClientMainContactItem = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email_address: string | null;
};

export type ContactClientItem = {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  is_main: boolean;
  notes: string | null;
  phone_number: string | null;
  email_address: string | null;
  profile_picture_url: string | null;
};

export type ClientDocumentItem = {
  id: string;
  document_name: string;
  file_path: string | null;
  storage_type: string;
  is_visual: boolean;
  external_url: string | null;
};

export type ClientListItem = {
  id: string;
  client_name: string;
  website: string;
  address_city: string | null;
  is_active: boolean;
  logo_url: string | null;
  categories: ClientCategoryItem[];
  responsible: ClientResponsibleItem;
  main_contact: ClientMainContactItem | null;
  mission_count: number;
  opportunity_count: number;
};

export type ClientDetail = ClientListItem & {
  address_street: string | null;
  address_zip: string | null;
  address_country: string;
  drive_link: string | null;
  notes: string | null;
  logo_id: string | null;
  main_collaborator_id: string;
  contacts: ContactClientItem[];
  documents: ClientDocumentItem[];
};
