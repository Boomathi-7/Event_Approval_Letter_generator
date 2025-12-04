import { useState } from 'react';
import { jsPDF } from 'jspdf';
// Import your logo from assets folder
// Adjust the path as needed depending on where your logo is stored
import logo from '../assets/kite-logo.webp';
import ipsLogo from '../assets/ips.webp';

const Template = () => {
  // State for form fields

  // State for number of particulars (max 7)
  const [numberOfParticulars, setNumberOfParticulars] = useState(3);

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

  // Handle change in number of particulars
  const handleNumberOfParticularsChange = (e) => {
    const count = parseInt(e.target.value);
    setNumberOfParticulars(count);
    // Adjust particulars array
    const newParticulars = Array(count).fill(null).map((_, idx) => 
      approvalData.particulars[idx] || { particular: '', amount: '' }
    );
    setApprovalData(prev => ({ ...prev, particulars: newParticulars }));
  };

  const handleParticularChange = (index, field, value) => {
    // sanitize amount input to allow only positive numbers (no negatives, no letters)
    const sanitizeAmount = (v) => {
      if (v === '') return '';
      // remove all characters except digits and dot
      let s = String(v).replace(/[^0-9.]/g, '');
      // keep only first dot
      const parts = s.split('.');
      if (parts.length > 1) {
        s = parts[0] + '.' + parts.slice(1).join('');
      }
      // keep leading zeros (they may be valid like 0.50)
      return s;
    };

    setApprovalData(prev => {
      const newPart = [...prev.particulars];
      const updated = { ...newPart[index] };
      if (field === 'amount') {
        updated.amount = sanitizeAmount(value);
      } else {
        updated[field] = value;
      }
      newPart[index] = updated;
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
    // Validate required fields before generating
    const newErrors = {};
    if (!approvalData.department || approvalData.department.trim() === '') newErrors.department = 'Department is required';
    if (!approvalData.from || approvalData.from.trim() === '') newErrors.from = 'From is required';
    if (!approvalData.through || approvalData.through.trim() === '') newErrors.through = 'Through is required';
    if (!approvalData.to || approvalData.to.trim() === '') newErrors.to = 'To is required';
    if (!approvalData.subject || approvalData.subject.trim() === '') newErrors.subject = 'Subject is required';
    if (!approvalData.body || approvalData.body.trim() === '') newErrors.body = 'Body is required';
    // particulars: at least one row should be filled (particular text)
    const anyParticularFilled = approvalData.particulars && approvalData.particulars.some(p => p && p.particular && p.particular.trim() !== '');
    if (!anyParticularFilled) newErrors.particulars = 'At least one particular must be filled';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.alert('Please fill required fields before generating the PDF');
      return;
    }
    setErrors({});
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Use built-in Times font to avoid runtime font-registration issues
      try { pdf.setFont('times', 'normal'); } catch (e) {}
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
      pdf.text('From', tableX + colW / 2, tableY + 5, { align: 'center' });
      pdf.text('Through', tableX + colW + colW / 2, tableY + 5, { align: 'center' });
      pdf.text('To', tableX + colW * 2 + colW / 2, tableY + 5, { align: 'center' });

      try { pdf.setFont('times', 'normal'); } catch (e) {}
      const lineHeight = 5;
      const startY = tableY + 12;
      const availableHeight = 28 - 12; // 16mm for content
      
      // Split by comma, semicolon or newline to get multiple entries
      const splitEntries = (text) => {
        if (!text) return [];
        return text.split(/[,;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      };
      
      const fromEntries = splitEntries(approvalData.from || '');
      const throughEntries = splitEntries(approvalData.through || '');
      const toEntries = splitEntries(approvalData.to || '');
      
      // Render each entry on a new line
      fromEntries.forEach((entry, i) => {
        if (startY + i * lineHeight < tableY + 28 - 2) {
          pdf.text(entry, tableX + 3, startY + i * lineHeight);
        }
      });
      
      throughEntries.forEach((entry, i) => {
        if (startY + i * lineHeight < tableY + 28 - 2) {
          pdf.text(entry, tableX + colW + 3, startY + i * lineHeight);
        }
      });
      
      toEntries.forEach((entry, i) => {
        if (startY + i * lineHeight < tableY + 28 - 2) {
          pdf.text(entry, tableX + colW * 2 + 3, startY + i * lineHeight);
        }
      });

      // Subject area and body
      const subjY = tableY + 33;
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      pdf.text('Sub :', tableX, subjY + 4);
      // small subject line above the box
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text(approvalData.subject || '', tableX + 18, subjY + 4);
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      const subjBoxY = subjY + 8;

      // Compute budget area early so subject box can fill remaining space above it
      const particularCount = approvalData.particulars.length;
      const rowH_for_budget = particularCount <= 5 ? 8 : 6.5; // Smaller rows if more than 5 particulars
      const budgetRows_for_calc = particularCount + 2; // header + particulars + total
      const budgetW_for_calc = 120;
      const budgetH_for_calc = rowH_for_budget * budgetRows_for_calc;
      const budgetY_for_calc = pageHeight - margin - budgetH_for_calc - 12;
      // subject box height should end above budget table
      // leave extra vertical gap between subject box and budget table to avoid overlap
      const subjBoxH = Math.max(80, budgetY_for_calc - subjBoxY - 20);
      pdf.rect(tableX, subjBoxY, tableW, subjBoxH);

      // Render body text first and then table (if attached) below the body inside the subject box
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      pdf.setFontSize(10);
      const bodyLines = pdf.splitTextToSize(approvalData.body || '', tableW - 6);
      const lineH = 4.5; // approx mm per line for current font/size
      let cursorY = subjBoxY + 8;
      if (bodyLines && bodyLines.length > 0) {
        // compute available height for body inside subject box
        const availableBodyH = subjBoxH - 12; // padding
        const maxLines = Math.max(0, Math.floor(availableBodyH / lineH));
        let renderLines = bodyLines;
        let truncated = false;
        if (bodyLines.length > maxLines) {
          renderLines = bodyLines.slice(0, maxLines);
          truncated = true;
        }
        // if truncated, append ellipsis to last line
        if (truncated && renderLines.length > 0) {
          const lastIdx = renderLines.length - 1;
          renderLines[lastIdx] = renderLines[lastIdx].replace(/\s+$/, '') + ' ...';
        }
        pdf.text(renderLines, tableX + 3, cursorY);
        cursorY += renderLines.length * lineH + 4;
      }

      // If a table is attached, render it starting at cursorY (below body) inside subj box
      if (approvalData.attachTable && approvalData.table && approvalData.table.length > 0) {
        const t = approvalData.table;
        const rows = t.length;
        const cols = t[0].length || 1;
        const availableW = tableW - 6;
        const cellW = availableW / cols;
        const remainingH = subjBoxY + subjBoxH - cursorY - 6;
        if (remainingH > 6) {
          let cellH = 7;
          if (rows * cellH > remainingH) cellH = Math.max(4, Math.floor(remainingH / rows));

          pdf.setFontSize(9);
          pdf.setLineWidth(0.2);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const x = tableX + 3 + c * cellW;
              const y = cursorY + r * cellH;
              // don't draw cells that would overflow subj box
              if (y + cellH > subjBoxY + subjBoxH) continue;
              pdf.rect(x, y - 4, cellW, cellH);
              const text = t[r][c] || '';
              const lines = pdf.splitTextToSize(String(text), cellW - 4);
              pdf.text(lines, x + 2, y - 1);
            }
          }
        }
      }

      // Event Budget title will be drawn above the budget table (after budget position computed)

      // Draw budget area computed earlier
      const rowH = rowH_for_budget;
      const budgetRows = budgetRows_for_calc;
      const budgetW = budgetW_for_calc;
      const budgetX = (pageWidth - budgetW) / 2;
      const budgetY = budgetY_for_calc;

      // draw budget rows
      pdf.setLineWidth(0.3);
      for (let r = 0; r < budgetRows; r++) {
        pdf.rect(budgetX, budgetY + r * rowH, budgetW, rowH);
      }

      // Draw Event Budget title above the budget table (centered over the budget box)
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.setFontSize(12);
      const budgetTitleX = budgetX + budgetW / 2;
      const budgetTitleY = budgetY - 6; // place title closer to the table
      pdf.text('Event Budget', budgetTitleX, budgetTitleY, { align: 'center' });

      // column separators (S.No, Particulars, Amount)
      const col1 = 18; // S.No
      const col2 = 72; // Particulars
      pdf.line(budgetX + col1, budgetY, budgetX + col1, budgetY + rowH * budgetRows);
      pdf.line(budgetX + col1 + col2, budgetY, budgetX + col1 + col2, budgetY + rowH * budgetRows);

      // header texts (centered where requested)
      pdf.setFontSize(9);
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text('S.No', budgetX + col1 / 2, budgetY + 6, { align: 'center' });
      // center Particulars header in its column
      pdf.text('Particulars', budgetX + col1 + col2 / 2, budgetY + 6, { align: 'center' });
      // center Amount header in its column area
      pdf.text('Amount', budgetX + col1 + col2 + (budgetW - col1 - col2) / 2, budgetY + 6, { align: 'center' });

      // fill rows from approvalData.particulars and center-align amounts
      try { pdf.setFont('times', 'normal'); } catch (e) {}
      let total = 0;
      const col3 = budgetW - col1 - col2; // Amount column width
      for (let i = 0; i < approvalData.particulars.length; i++) {
        const p = approvalData.particulars[i] ? approvalData.particulars[i].particular : '';
        const a = approvalData.particulars[i] ? approvalData.particulars[i].amount : '';
        pdf.text(`${i + 1}.`, budgetX + col1 / 2, budgetY + rowH * (i + 1) + 6, { align: 'center' });
        pdf.text(p || 'nil', budgetX + col1 + 6, budgetY + rowH * (i + 1) + 6);
        // center align amount within amount column
        const amountCenterX = budgetX + col1 + col2 + col3 / 2;
        pdf.text(a ? String(a) : '0', amountCenterX, budgetY + rowH * (i + 1) + 6, { align: 'center' });
        const num = parseFloat(String(a).replace(/,/g, '')) || 0;
        total += num;
      }

      // Total row - center align value (after all particulars)
      const totalRowIndex = approvalData.particulars.length + 1;
      try { pdf.setFont('times', 'bold'); } catch (e) {}
      pdf.text('Total', budgetX + col1 + 6, budgetY + rowH * totalRowIndex + 6);
      const amountCenterX = budgetX + col1 + col2 + col3 / 2;
      pdf.text(total.toFixed(2), amountCenterX, budgetY + rowH * totalRowIndex + 6, { align: 'center' });

      // Add "Powered by IPS Tech Community" at bottom right in italic
      try { pdf.setFont('times', 'italic'); } catch (e) {}
      pdf.setFontSize(9);
      pdf.text('Powered by IPS Tech Community', pageWidth - margin - 10, pageHeight - margin - 2, { align: 'right' });

      // Save
      pdf.save(`Event_Approval_Letter_${(approvalData.department || 'dept')}.pdf`);
    } catch (err) {
      console.error('Approval PDF error', err);
      // show a more descriptive alert to help debugging
      const msg = (err && err.message) ? err.message : String(err);
      alert(`Error generating approval letter PDF: ${msg}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Reset form (approval fields)
  const resetForm = () => {
    setNumberOfParticulars(3);
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
                
                <img 
                    src={ipsLogo} 
                    alt="IPS Tech Logo" 
                    className="h-27 w-auto object-contain"
                  />
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
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Department <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.department.length}/30)</span>
                  </label>
                  <input type="text" name="department" value={approvalData.department} onChange={handleApprovalChange} placeholder="Department" required maxLength={30} className="w-full px-3 py-2 border rounded-lg bg-white" />
                  {errors.department && <p className="text-red-600 text-sm mt-1">{errors.department}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    From <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.from.length}/100)</span>
                  </label>
                  <input type="text" name="from" value={approvalData.from} onChange={handleApprovalChange} placeholder="From" maxLength={100} className="w-full px-3 py-2 border rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Through <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.through.length}/100)</span>
                  </label>
                  <input type="text" name="through" value={approvalData.through} onChange={handleApprovalChange} placeholder="Through" required maxLength={100} className="w-full px-3 py-2 border rounded-lg bg-white" />
                  {errors.through && <p className="text-red-600 text-sm mt-1">{errors.through}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    To <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.to.length}/100)</span>
                  </label>
                  <input type="text" name="to" value={approvalData.to} onChange={handleApprovalChange} placeholder="To" required maxLength={100} className="w-full px-3 py-2 border rounded-lg bg-white" />
                  {errors.to && <p className="text-red-600 text-sm mt-1">{errors.to}</p>}
                </div>
              </div>

              {/* Note for From, Through, To fields */}
              <div className="my-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Note:</span> Enter fields of From, Through & To as comma or semicolon separated ones for multiple entries.
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Subject <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.subject.length}/150)</span>
                </label>
                <input name="subject" value={approvalData.subject} onChange={handleApprovalChange} className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Subject for the approval letter" required maxLength={150} />
                {errors.subject && <p className="text-red-600 text-sm mt-1">{errors.subject}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Body of the letter <span className="text-red-500">*</span> <span className="text-gray-500 text-xs ml-2">({approvalData.body.length}/800)</span>
                </label>
                <textarea name="body" rows={6} value={approvalData.body} onChange={handleApprovalChange} className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Write the body of the approval letter here" required maxLength={800} />
                {errors.body && <p className="text-red-600 text-sm mt-1">{errors.body}</p>}
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
                    {/* Paste Table Content + Table Editor */}
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Paste Table Content</label>
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

              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-blue-700">Particulars <span className="text-red-500">*</span></h4>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-blue-700">Number of particulars:</label>
                    <select 
                      value={numberOfParticulars} 
                      onChange={handleNumberOfParticularsChange}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.particulars && <p className="text-red-600 text-sm mt-1 text-center">{errors.particulars}</p>}
                <div className="space-y-3">
                  {approvalData.particulars.map((b, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 items-center">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">{idx + 1}.</span>
                        <input value={b.particular} onChange={(e) => handleParticularChange(idx, 'particular', e.target.value)} placeholder={`Particular ${idx + 1}`} maxLength={50} className="flex-1 px-3 py-2 border rounded-lg bg-white" />
                      </div>
                      <div>
                        <input type="text" inputMode="decimal" value={b.amount} onChange={(e) => handleParticularChange(idx, 'amount', e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Note:</span> The date will be automatically filled with today's date when you generate the PDF.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting || isGeneratingPdf}
                  className="px-5 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Form
                </button>
                <button type="button" onClick={generateApprovalLetterPdf} disabled={isGeneratingPdf} className="px-5 py-3 bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 border border-transparent rounded-lg shadow-md text-sm font-medium text-white transition-all duration-200 flex items-center gap-2">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isGeneratingPdf ? 'Generating Approval PDF...' : 'Generate Approval Letter PDF'}
                </button>
              </div>
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