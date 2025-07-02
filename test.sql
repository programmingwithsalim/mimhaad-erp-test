-- Agency Banking Float GL
INSERT INTO gl_accounts (code, name, type, branch_id, is_active)
VALUES
  ('AGB-635844', 'Agency Banking Float - Cal Bank', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true),
  ('AGB-635844-GCB', 'Agency Banking Float - GCB', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true),
  ('AGB-635844-FID', 'Agency Banking Float - Fidelity', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true);

-- MoMo Float GLs
INSERT INTO gl_accounts (code, name, type, branch_id, is_active)
VALUES
  ('MOMO-635844-MTN', 'MoMo Float - MTN', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true),
  ('MOMO-635844-TEL', 'MoMo Float - Telecel', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true),
  ('MOMO-635844-ZPAY', 'MoMo Float - Z-Pay', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true);

-- Power Float GLs
INSERT INTO gl_accounts (code, name, type, branch_id, is_active)
VALUES
  ('PWR-635844-NEDCO', 'Power Float - NEDCo', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true),
  ('PWR-635844-ECG', 'Power Float - ECG', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true);

-- Cash in Till GL
INSERT INTO gl_accounts (code, name, type, branch_id, is_active)
VALUES
  ('CASH-635844', 'Cash in Till', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true);

-- E-Zwich Float GL
INSERT INTO gl_accounts (code, name, type, branch_id, is_active)
VALUES
  ('EZWICH-635844', 'E-Zwich Float', 'Asset', '635844ab-029a-43f8-8523-d7882915266a', true);



INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', '1dea5839-5377-45f0-b015-4fdbd0198b96', '0c6320ae-fb6c-408e-8cfa-934d6d253087', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', '6cae35d1-baba-4fae-9f79-9101dd28024b', '0c6320ae-fb6c-408e-8cfa-934d6d253087', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'd8dd63b2-c8c5-4899-ba27-3e60bef2cd60', '0c6320ae-fb6c-408e-8cfa-934d6d253087', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'e0ead524-bdbc-4cd6-afd9-0efd78776d89', '0c6320ae-fb6c-408e-8cfa-934d6d253087', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'd44b7df1-8fe8-47e1-a3bd-cd1827b33e0b', '141439f2-e534-45e7-9a3c-0b856cecfdad', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', '22fc986f-461a-4772-bf22-88d5f8382ddc', '141439f2-e534-45e7-9a3c-0b856cecfdad', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', '96e89d69-c160-4df2-a592-7ae50379fd55', '141439f2-e534-45e7-9a3c-0b856cecfdad', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', '48bb8558-3a29-472e-a567-732d42ce4a44', '141439f2-e534-45e7-9a3c-0b856cecfdad', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'ee6594f8-74eb-4d62-a097-db475fc3b49e', '49f9aec4-8c95-42a9-b9d2-7a2688d0096c', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'f52935b1-aa7e-4e7f-85cb-590bad9b0874', '49f9aec4-8c95-42a9-b9d2-7a2688d0096c', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'f9e9797a-bef5-4e37-8ff5-10eb4fdc2c5b', '49f9aec4-8c95-42a9-b9d2-7a2688d0096c', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'momo_float', 'f871c7d1-9dc7-4ddf-865b-a6bc246552cd', '49f9aec4-8c95-42a9-b9d2-7a2688d0096c', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '1f821de8-72ce-42f0-aaab-b5674dee8f44', '0b23f10b-21c5-47da-9e51-075887aad6ee', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '7ee3c6ad-81f5-43f0-b62e-a73e1f295b1a', '0b23f10b-21c5-47da-9e51-075887aad6ee', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '7df8edc8-4f4b-4a45-a246-d439c7aff0ec', '0b23f10b-21c5-47da-9e51-075887aad6ee', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '316438b6-48d7-4297-83d2-551098693dfc', '0b23f10b-21c5-47da-9e51-075887aad6ee', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '1d950287-ef78-4bfd-b46d-587ff8284c26', '1317f82e-b5ce-41a4-9997-6be9d2011431', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '0c85646a-54c9-479d-9138-ba9e34361965', '1317f82e-b5ce-41a4-9997-6be9d2011431', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', 'd6dee038-e255-4feb-8fa5-b8d4a9ecd0da', '1317f82e-b5ce-41a4-9997-6be9d2011431', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '43a45299-43e3-4c65-881e-d3586790519d', '1317f82e-b5ce-41a4-9997-6be9d2011431', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '23b90e7e-3cf9-47f5-8a76-84b51d261eb9', 'aece4b19-d8e9-4d99-bc52-a8c12bc72eb2', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', 'cc538c70-c9ec-439d-a3f4-d9eb5a6f1ad1', 'aece4b19-d8e9-4d99-bc52-a8c12bc72eb2', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', '182d9a1a-890c-4bfc-900a-2608b9eebbfb', 'aece4b19-d8e9-4d99-bc52-a8c12bc72eb2', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'agency_banking_float', 'ce880a95-07c8-40b8-8cf0-1fc4999ca783', 'aece4b19-d8e9-4d99-bc52-a8c12bc72eb2', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', 'd8e90e8e-a3ac-423a-be66-561dc65bb651', '2fe947a8-c85f-42b8-9aff-c85bc4439484', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', 'd4f2a849-140d-4e4b-a356-6251774da202', '2fe947a8-c85f-42b8-9aff-c85bc4439484', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', '53106340-7c18-4f7d-ac41-1024a465c8fe', '2fe947a8-c85f-42b8-9aff-c85bc4439484', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', '45454d3e-cb91-4804-b9cc-973fd2ab9003', '2fe947a8-c85f-42b8-9aff-c85bc4439484', 'commission', true);

INSERT INTO gl_mappings (branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active) VALUES
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', 'b1c2f3d4-6993-4287-81ef-00965c21fd20', 'd1a2470c-3528-426e-afd5-b40d0f2ba9ca', 'fee', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', 'b0c0c93c-5255-464d-88c2-6e2f6fa53045', 'd1a2470c-3528-426e-afd5-b40d0f2ba9ca', 'revenue', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', '77b8a654-b64a-4fb1-a38a-5c4339c6b71b', 'd1a2470c-3528-426e-afd5-b40d0f2ba9ca', 'expense', true),
('635844ab-029a-43f8-8523-d7882915266a', 'power_float', '2b4890a3-91f1-4195-b892-7c3eaf1c7371', 'd1a2470c-3528-426e-afd5-b40d0f2ba9ca', 'commission', true);