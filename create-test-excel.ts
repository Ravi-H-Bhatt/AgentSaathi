/**
 * Create a test Excel file with the sample data provided by the user
 */

import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const data = [
  ['Dept Code', 'Department Name', 'Policy/Endt number', 'Insured Name', 'Policy Expiry Date', 'ELG Premium Amount', 'Ineligible Amount', 'Commission Amount', 'Insured Type'],
  [28, 'Health', '0605002825P107058385/0', 'DAKSHABEN ASHWINBHAI RAVAL', '02/08/2026', 39680.55, 7142.00, 1725.99, 'Individual'],
  [28, 'Health', '0605002825P107063244/0', 'SMT. DEVIKABEN N. DESAI', '05/08/2026', 35151.42, 6328.00, 1257.12, 'Individual'],
  [28, 'Health', '0605002825P107150111/0', 'JOSHI NIMESHBHAI KANTILAL', '12/08/2026', 63161.46, 11368.00, 3520.12, 'Individual'],
  [28, 'Health', '0605002825P107245525/0', 'DRUV NIMESH JOSHI', '12/08/2026', 22952.95, 4132.00, 1721.48, 'Individual'],
  [28, 'Health', '0605002825P107476106/0', 'GIRISHCHANDRA B. SHUKLA.', '16/08/2026', 16866.00, 3036.00, 505.98, 'Individual'],
  [28, 'Health', '0605002825P107476451/0', 'JATIN C SHAH', '19/08/2026', 71761.10, 12916.00, 2152.84, 'Individual'],
  [28, 'Health', '0605002825P108058535/0', 'MIHIR M TRIVEDI', '25/08/2026', 15419.00, 2776.00, 1156.43, 'Individual'],
  [28, 'Health', '0605002825P108124088/0', 'VIVISHA MAHENDRA SHAH', '18/09/2026', 5718.75, 1030.00, 428.91, 'Individual'],
  [28, 'Health', '0605002825P108766335/0', 'POONAM P BHATT', '05/09/2026', 17897.00, 3222.00, 1342.28, 'Individual'],
  [28, 'Health', '0605002825P110623047/0', 'MAHESH B. THAKER.', '03/10/2026', 26570.00, 0, 797.10, 'Individual'],
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
XLSX.writeFile(workbook, '/tmp/test-policies.xlsx');

console.log('✅ Test Excel file created: /tmp/test-policies.xlsx');
