const XLSX = require('xlsx');
const path = require('path');

const data = [
  {
    "Full Name": "Alice Smith",
    "CNIC": "42101-9999999-1",
    "WhatsApp": "+923000000001",
    "Email": "alice.smith@example.com",
    "Customer Type": "Salaried",
    "Portal Username": "alicesmith_tax",
    "Portal PIN": "1122",
    "Portal Password": "Password123!"
  },
  {
    "Full Name": "Bob Johnson",
    "CNIC": "42101-9999999-2",
    "WhatsApp": "+923000000002",
    "Email": "bob.johnson@example.com",
    "Customer Type": "Business",
    "Portal Username": "bobjohnson_tax",
    "Portal PIN": "3344",
    "Portal Password": "Password456!"
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Clients");

const filePath = path.join(__dirname, '../sample_clients.xlsx');
XLSX.writeFile(wb, filePath);
console.log('Sample Excel file created at:', filePath);
