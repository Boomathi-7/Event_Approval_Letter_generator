import { useState } from 'react';
import { jsPDF } from 'jspdf';
// Import your logo from assets folder
// Adjust the path as needed depending on where your logo is stored
import logo from '../assets/kite-logo.webp';
import ipsLogo from '../assets/ips.webp';

const Template = () => {
  // State for form fields

  // State for approval-letter specific fields
  const [approvalData, setApprovalData] = useState({
    from: '',
    through: '',
    to: '',
    department: '',
    subject: '',
    body: '',
    particulars: [
      { particular: '', amount: '' },
      { particular: '', amount: '' },
      { particular: '', amount: '' }
    ],
    attachTable: false,
    tableFile: '',
    tableContent: '',
    // table represented as array of rows, each row is array of cells
    table: [
      ['', ''],
      ['', ''],
      ['', '']
    ]
  });
  
  
  // State for form validation and submission
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // References to form elements

  // Handle approval-letter input changes
  const handleApprovalChange = (e) => {
    const { name, value } = e.target;
    setApprovalData(prev => ({ ...prev, [name]: value }));
  };

  const handleParticularChange = (index, field, value) => {
    setApprovalData(prev => {
      const newPart = [...prev.particulars];
      newPart[index] = { ...newPart[index], [field]: value };
      return { ...prev, particulars: newPart };
    });
  };

  // Table editor helpers
  const updateTableCell = (r, c, value) => {
    setApprovalData(prev => {
      const t = prev.table.map(row => row.slice());
      if (!t[r]) return prev;
      t[r][c] = value;
      return { ...prev, table: t };
    });
  };

  const addTableRow = () => {
    setApprovalData(prev => {
      const cols = prev.table && prev.table[0] ? prev.table[0].length : 2;
      const t = prev.table ? prev.table.map(r => r.slice()) : [];
      t.push(new Array(cols).fill(''));
      return { ...prev, table: t };
    });
  };

  const addTableCol = () => {
    setApprovalData(prev => {
      const t = prev.table ? prev.table.map(r => r.slice()) : [];
      return { ...prev, table: t.map(r => { r.push(''); return r; }) };
    });
  };

  const removeTableRow = (idx) => {
    setApprovalData(prev => {
      const t = prev.table ? prev.table.map(r => r.slice()) : [];
      if (t.length <= 1) return prev;
      t.splice(idx, 1);
      return { ...prev, table: t };
    });
  };

  const removeTableCol = (idx) => {
    setApprovalData(prev => {
      const t = prev.table ? prev.table.map(r => r.slice()) : [];
      if (!t[0] || t[0].length <= 1) return prev;
      t.forEach(r => r.splice(idx, 1));
      return { ...prev, table: t };
    });
  };

  const parseTableContent = () => {
    const raw = approvalData.tableContent || '';
    const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return;
    const parsed = lines.map(line => {
      // try tab first, then comma, then multiple spaces
      if (line.indexOf('\t') >= 0) return line.split('\t').map(c => c.trim());
      if (line.indexOf(',') >= 0) return line.split(',').map(c => c.trim());
      return line.split(/\s{2,}/).map(c => c.trim());
    });
    setApprovalData(prev => ({ ...prev, table: parsed }));
  };
  

  // Generate Event Approval Letter PDF
  const generateApprovalLetterPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 6; // mm

      // Draw outer border
      pdf.setLineWidth(0.6);
      pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // Fixed issue date for header
      const issueDate = '02 / 30.08.2024';
      
      // Current date for the Date field (when PDF is generated)
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-GB');

      // Header table structure (matching Pasted Image 1)
      const headerStartY = margin + 4;
      const headerHeight = 38;
      
      // Define column widths
      const logoColWidth = 40;
      const middleColWidth = pageWidth - margin * 2 - logoColWidth - 60;
      const rightColWidth = 60;
      
      // Draw main header table structure
      // Top row with 3 columns (logo, middle content, right info box)
      pdf.setLineWidth(0.4);
      
      // Logo column
      pdf.rect(margin, headerStartY, logoColWidth, headerHeight);

      try {
        if (logo) {
          pdf.addImage(logo, 'PNG', margin + 6, headerStartY + 8, 28, 22);
        }
      } catch (e) {
        // ignore image errors
      }

      // Middle column - divided into 4 rows
      const middleX = margin + logoColWidth;
      const row1H = headerHeight / 4;
      const row2H = headerHeight / 4;
      const row3H = headerHeight / 4;
      const row4H = headerHeight / 4;
      
      // Row 1: Institute name
      pdf.rect(middleX, headerStartY, middleColWidth, row1H);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KGISL INSTITUTE OF TECHNOLOGY,', middleX + middleColWidth / 2, headerStartY + row1H / 2 + 1.5, { align: 'center' });
      
      // Row 2: Location
      pdf.rect(middleX, headerStartY + row1H, middleColWidth, row2H);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('COIMBATORE -35, TN, INDIA', middleX + middleColWidth / 2, headerStartY + row1H + row2H / 2 + 1.5, { align: 'center' });
      
      // Row 3: Academic - Forms
      pdf.rect(middleX, headerStartY + row1H + row2H, middleColWidth, row3H);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ACADEMIC - FORMS', middleX + middleColWidth / 2, headerStartY + row1H + row2H + row3H / 2 + 1.5, { align: 'center' });
      
      // Row 4: Academic Year (swapped with Event Approval Letter)
      pdf.rect(middleX, headerStartY + row1H + row2H + row3H, middleColWidth, row4H);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ACADEMIC YEAR: 2024 - 2025', middleX + middleColWidth / 2, headerStartY + row1H + row2H + row3H + row4H / 2 + 1.5, { align: 'center' });
      
      // Right column - divided into 3 rows
      const rightX = middleX + middleColWidth;
      const rightRow1H = headerHeight / 3;
      const rightRow2H = headerHeight / 3;
      const rightRow3H = headerHeight / 3;
      
      // Row 1: Doc. Ref.
      pdf.rect(rightX, headerStartY, rightColWidth, rightRow1H);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Doc. Ref.', rightX + rightColWidth / 2, headerStartY + rightRow1H / 3 + 1, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.text('KITE/AC/AL/ 75', rightX + rightColWidth / 2, headerStartY + rightRow1H / 3 + 7, { align: 'center' });
      
      // Row 2: Issue No / Date
      pdf.rect(rightX, headerStartY + rightRow1H, rightColWidth, rightRow2H);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Issue No / Date', rightX + rightColWidth / 2, headerStartY + rightRow1H + rightRow2H / 3 + 1, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(issueDate, rightX + rightColWidth / 2, headerStartY + rightRow1H + rightRow2H / 3 + 7, { align: 'center' });
      
      // Row 3: Department
      pdf.rect(rightX, headerStartY + rightRow1H + rightRow2H, rightColWidth, rightRow3H);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Department', rightX + rightColWidth / 2, headerStartY + rightRow1H + rightRow2H + rightRow3H / 3 + 1, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(approvalData.department || '', rightX + rightColWidth / 2, headerStartY + rightRow1H + rightRow2H + rightRow3H / 3 + 7, { align: 'center' });

      // Title below header table
      const titleY = headerStartY + headerHeight + 10;
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EVENT APPROVAL LETTER', pageWidth / 2, titleY, { align: 'center' });

      // Date on right (uses current date when PDF is generated) - aligned with title
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${currentDate}`, pageWidth - margin - 10, titleY, { align: 'right' });
      
      const dateY = titleY;
      // From / Through / To table
      const tableY = dateY + 8;
      const tableX = margin + 10;
      const tableW = pageWidth - margin * 2 - 20;
      const colW = tableW / 3;

      pdf.setLineWidth(0.4);
      pdf.rect(tableX, tableY, tableW, 28);
      // vertical separators
      pdf.line(tableX + colW, tableY, tableX + colW, tableY + 28);
      pdf.line(tableX + colW * 2, tableY, tableX + colW * 2, tableY + 28);

      pdf.setFontSize(10);
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text('From', tableX + colW / 2, tableY + 8, { align: 'center' });
      pdf.text('Through', tableX + colW + colW / 2, tableY + 8, { align: 'center' });
      pdf.text('To', tableX + colW * 2 + colW / 2, tableY + 8, { align: 'center' });

      try { pdf.setFont('times', 'normal'); } catch (e) {}
      const fromText = pdf.splitTextToSize(approvalData.from || '', colW - 6);
      const throughText = pdf.splitTextToSize(approvalData.through || '', colW - 6);
      const toText = pdf.splitTextToSize(approvalData.to || '', colW - 6);
      pdf.text(fromText, tableX + 3, tableY + 14);
      pdf.text(throughText, tableX + colW + 3, tableY + 14);
      pdf.text(toText, tableX + colW * 2 + 3, tableY + 14);

      // Subject area and body
      const subjY = tableY + 38;
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      pdf.text('Sub :', tableX, subjY + 4);
      // small subject line above the box
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text(approvalData.subject || '', tableX + 18, subjY + 4);
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      const subjBoxY = subjY + 8;
      const subjBoxH = 92; // provide slightly more room
      pdf.rect(tableX, subjBoxY, tableW, subjBoxH);

      // Render body text first and then table (if attached) below the body inside the subject box
      pdf.setFontSize(10);
      const bodyLines = pdf.splitTextToSize(approvalData.body || '', tableW - 6);
      const lineH = 4.5; // approx mm per line for current font/size
      let cursorY = subjBoxY + 8;
      if (bodyLines && bodyLines.length > 0) {
        pdf.text(bodyLines, tableX + 3, cursorY);
        cursorY += bodyLines.length * lineH + 4;
      }

      // If a table is attached, render it starting at cursorY (below body) inside subj box
      if (approvalData.attachTable && approvalData.table && approvalData.table.length > 0) {
        const t = approvalData.table;
        const rows = t.length;
        const cols = t[0].length || 1;
        const availableW = tableW - 6;
        const cellW = availableW / cols;
        const remainingH = subjBoxY + subjBoxH - cursorY - 6;
        let cellH = 7;
        if (rows * cellH > remainingH) cellH = Math.max(4, Math.floor(remainingH / rows));

        pdf.setFontSize(9);
        pdf.setLineWidth(0.2);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = tableX + 3 + c * cellW;
            const y = cursorY + r * cellH;
            pdf.rect(x, y - 4, cellW, cellH);
            const text = t[r][c] || '';
            const lines = pdf.splitTextToSize(String(text), cellW - 4);
            pdf.text(lines, x + 2, y - 1);
          }
        }
      }

      // Event Budget table near bottom
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text('Event Budget', pageWidth / 2, pageHeight - 82, { align: 'center' });

      const budgetW = 120;
      const budgetX = (pageWidth - budgetW) / 2;
      const budgetY = pageHeight - 76; // Increased from 64 to 76 for more space
      const rowH = 8;
      const col1 = 18; // S.No
      const col2 = 72; // Particulars
      const col3 = budgetW - col1 - col2; // Amount

      // header row + 3 particulars + total (5 rows total)
      pdf.setLineWidth(0.3);
      pdf.rect(budgetX, budgetY, budgetW, rowH); // Header
      pdf.rect(budgetX, budgetY + rowH, budgetW, rowH); // Particular 1
      pdf.rect(budgetX, budgetY + rowH * 2, budgetW, rowH); // Particular 2
      pdf.rect(budgetX, budgetY + rowH * 3, budgetW, rowH); // Particular 3
      pdf.rect(budgetX, budgetY + rowH * 4, budgetW, rowH); // Total row

      // column separators
      pdf.line(budgetX + col1, budgetY, budgetX + col1, budgetY + rowH * 4);
      pdf.line(budgetX + col1 + col2, budgetY, budgetX + col1 + col2, budgetY + rowH * 4);

      // header texts
      pdf.setFontSize(9);
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text('S.No', budgetX + col1 / 2, budgetY + 6, { align: 'center' });
      pdf.text('Particulars', budgetX + col1 + 6, budgetY + 6);
      pdf.text('Amount', budgetX + col1 + col2 + 20, budgetY + 6);

      // fill rows from approvalData.particulars
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      let total = 0;
      for (let i = 0; i < approvalData.particulars.length; i++) {
        const p = approvalData.particulars[i] ? approvalData.particulars[i].particular : '';
        const a = approvalData.particulars[i] ? approvalData.particulars[i].amount : '';
        pdf.text(`${i + 1}.`, budgetX + 4, budgetY + rowH * (i + 1) + 6);
        pdf.text(p || 'nil', budgetX + col1 + 6, budgetY + rowH * (i + 1) + 6);
        pdf.text(a ? a : '0', budgetX + col1 + col2 + 6, budgetY + rowH * (i + 1) + 6);
        const num = parseFloat(String(a).replace(/,/g, '')) || 0;
        total += num;
      }

      // Total row
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', budgetX + col1 + 6, budgetY + rowH * 4 + 6);
      pdf.text(total.toFixed(2), budgetX + col1 + col2 + 6, budgetY + rowH * 4 + 6);

      // Save
      pdf.save(`Event_Approval_Letter_${(approvalData.department || 'dept')}.pdf`);
    } catch (err) {
      console.error('Approval PDF error', err);
      alert('Error generating approval letter PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Reset form (approval fields)
  const resetForm = () => {
    setApprovalData({
      from: '',
      through: '',
      to: '',
      department: '',
      subject: '',
      body: '',
      particulars: [
        { particular: '', amount: '' },
        { particular: '', amount: '' },
        { particular: '', amount: '' }
      ],
      attachTable: false,
      tableFile: '',
      tableContent: '',
      table: [
        ['', ''],
        ['', ''],
        ['', '']
      ]
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Modern Professional Header - Light Version */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="relative">
            {/* Top accent bar */}
            <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-800 to-blue-900"></div>
            
            <div className="p-6 flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="bg-white p-3 rounded-lg shadow-md border border-blue-100">
                  <img 
                    src={logo} 
                    alt="KiTE Logo" 
                    className="h-14 w-auto object-contain"
                  />
                </div>
                <div className="pl-2">
                  <h2 className="text-2xl font-bold text-blue-900 tracking-tight">Event Approval Letter Generator</h2>
                  <div className="flex items-center mt-1">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></div>
                    <p className="text-black-600 text-sm font-medium">co-<span className="text-red-600">K</span>reate your <span className="text-red-600">G</span>enius</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                
                <a href="https://ips-community.netlify.app/" target="_blank" rel="noopener noreferrer" className="bg-white p-3 rounded-lg shadow-md border border-blue-100 transition-all hover:shadow-lg hover:border-blue-200 hover:scale-105">
                  <img 
                    src={ipsLogo} 
                    alt="IPS Tech Logo" 
                    className="h-12 w-auto object-contain"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-sky-900 to-blue-700 px-8 py-6">
            <h1 className="text-white text-3xl font-bold tracking-tight">Event Approval Letter Generator</h1>
            <p className="text-blue-50 text-sm mt-1">Fill the fields below and generate the approval letter PDF</p>
          </div>

          <form className="px-8 py-8 space-y-8 bg-gradient-to-br from-blue-50 to-sky-50">
            
            {/* Approval Letter Details */}
            <div className="bg-slate-50 rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z" />
                </svg>
                Event Approval Letter
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input type="text" name="department" value={approvalData.department} onChange={handleApprovalChange} placeholder="Department" className="w-full px-3 py-2 border rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <input type="text" name="from" value={approvalData.from} onChange={handleApprovalChange} placeholder="From" className="w-full px-3 py-2 border rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Through</label>
                  <input type="text" name="through" value={approvalData.through} onChange={handleApprovalChange} placeholder="Through" className="w-full px-3 py-2 border rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <input type="text" name="to" value={approvalData.to} onChange={handleApprovalChange} placeholder="To" className="w-full px-3 py-2 border rounded-lg bg-white" />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input name="subject" value={approvalData.subject} onChange={handleApprovalChange} className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Subject for the approval letter" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Body of the letter</label>
                <textarea name="body" rows={6} value={approvalData.body} onChange={handleApprovalChange} className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Write the body of the approval letter here" />
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Particulars</h4>
                <div className="space-y-3">
                  {approvalData.particulars.map((b, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_96px] gap-2 items-center">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">{idx + 1}.</span>
                        <input value={b.particular} onChange={(e) => handleParticularChange(idx, 'particular', e.target.value)} placeholder={`Particular ${idx + 1}`} className="flex-1 px-3 py-2 border rounded-lg bg-white" />
                      </div>
                      <div>
                        <input value={b.amount} onChange={(e) => handleParticularChange(idx, 'amount', e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={approvalData.attachTable} 
                    onChange={(e) => setApprovalData(prev => ({ ...prev, attachTable: e.target.checked }))}
                    className="w-4 h-4 border border-gray-300 rounded bg-white cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Attach additional table if required</span>
                </label>
              </div>

              {approvalData.attachTable && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Table Content</h4>
                  
                  <div className="space-y-4">
                    {/* Option 1: Upload File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Option 1: Upload File</label>
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const fileName = e.target.files[0].name;
                            setApprovalData(prev => ({ ...prev, tableFile: fileName }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {approvalData.tableFile && (
                        <p className="text-sm text-green-600 mt-2">✓ Selected: {approvalData.tableFile}</p>
                      )}
                    </div>

                    {/* Option 2: Paste Table Content + Table Editor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Option 2: Paste Table Content</label>
                      <textarea 
                        value={approvalData.tableContent || ''}
                        onChange={(e) => setApprovalData(prev => ({ ...prev, tableContent: e.target.value }))}
                        placeholder="Paste your table content here (copy from Word document, Excel, etc.)"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-2 flex items-center space-x-2">
                        <button type="button" onClick={parseTableContent} className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">Parse into table</button>
                        <button type="button" onClick={addTableRow} className="px-3 py-1 bg-white border rounded-md text-sm">Add row</button>
                        <button type="button" onClick={addTableCol} className="px-3 py-1 bg-white border rounded-md text-sm">Add column</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Tip: Copy a table from Word/Excel and paste it above, then click "Parse into table". You can also edit cells below.</p>

                      {/* Editable table grid */}
                      <div className="mt-3 overflow-auto border rounded-md bg-white">
                        <table className="min-w-full text-sm">
                          <tbody>
                            {approvalData.table && approvalData.table.map((row, rIdx) => (
                              <tr key={rIdx} className="border-t">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1 align-top border-r">
                                    <input value={cell} onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)} className="w-40 px-2 py-1 text-sm" />
                                  </td>
                                ))}
                                <td className="p-1 align-top">
                                  <div className="flex flex-col space-y-1">
                                    <button type="button" onClick={() => removeTableRow(rIdx)} className="px-2 py-1 text-xs bg-red-50 border rounded">Remove row</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Column controls */}
                        <div className="p-2 border-t bg-gray-50 flex items-center space-x-2">
                          <span className="text-xs text-gray-600">Columns:</span>
                          {approvalData.table && approvalData.table[0] && approvalData.table[0].map((_, cIdx) => (
                            <button key={cIdx} type="button" onClick={() => removeTableCol(cIdx)} className="px-2 py-1 text-xs bg-red-50 border rounded">Remove col {cIdx + 1}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={generateApprovalLetterPdf} disabled={isGeneratingPdf} className="px-5 py-3 bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 border border-transparent rounded-lg shadow-md text-sm font-medium text-white transition-all duration-200">
                  {isGeneratingPdf ? 'Generating Approval PDF...' : 'Generate Approval Letter PDF'}
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting || isGeneratingPdf}
                className="px-5 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <div className="flex items-center">Reset Form</div>
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Simple Footer - Matching Header Style */}
      <footer className="mt-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              {/* Logo */}
              <div className="flex items-center mb-4 md:mb-0">
                <span className="text-blue-600 font-mono text-xl mr-2">&lt;/&gt;</span>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">KGISL Institute of Technology</h3>
              </div>
            
              
            </div>
            
            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-600 text-sm mb-4 md:mb-0">
                  © {new Date().getFullYear()} KGISL Institute of Technology. All rights reserved.
                </p>
                <p className="text-gray-500 text-sm flex items-center space-x-3">
                  <span>Powered by IPS Tech Community</span>
                  <img src={ipsLogo} alt="IPS Tech" className="h-7 w-auto object-contain" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Template;