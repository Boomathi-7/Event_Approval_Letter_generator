import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
// Import your logo from assets folder
// Adjust the path as needed depending on where your logo is stored
import logo from '../assets/kite-logo.webp'; 
import pyExpoLogo from '../assets/PyExpoLogo.svg'; // Add this new import for Python Expo logo
import techCommunityLogo from '../assets/ips.webp'; // Change this path to match your actual logo location
import splitupTable from '../assets/splitup.png'; // Import the splitup table image

const Template = () => {
  // State for form fields
  const [formData, setFormData] = useState({
    rollNo: '', // Added roll number field
    expNo: '',
    expTitle: '',
    academicYear: '1', // Default to 1st year
    aim: '',
    procedure: '',
    result: ''
  });
  
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
    ]
  });
  
  
  // State for image uploads - now arrays to handle multiple images
  const [programImages, setProgramImages] = useState([]);
  const [outputImages, setOutputImages] = useState([]);
  
  // State for form validation and submission
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSplitupImageLoaded, setIsSplitupImageLoaded] = useState(true); // Track if splitup image is loaded
  
  // References to form elements

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

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

  // Prevent copy-paste for text inputs
  const preventCopyPaste = (e) => {
    e.preventDefault();
    alert("Copy-paste is not allowed. Please type manually.");
    return false;
  };

  // Handle multiple image uploads
  const handleImageUpload = (e, type) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Process each file
    const validFiles = [];
    let hasErrors = false;
    
    files.forEach(file => {
      // Validate file is an image
      if (!file.type.match('image.*')) {
        alert(`File "${file.name}" is not an image. Please upload only image files.`);
        hasErrors = true;
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 5MB limit.`);
        hasErrors = true;
        return;
      }
      
      validFiles.push(file);
    });
    
    if (hasErrors) {
      e.target.value = '';
      return;
    }
    
    // Process valid files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(loadEvent) {
        if (type === 'program') {
          setProgramImages(prev => [...prev, loadEvent.target.result]);
        } else {
          setOutputImages(prev => [...prev, loadEvent.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  };

  // Remove an image from the collection
  const removeImage = (index, type) => {
    if (type === 'program') {
      setProgramImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setOutputImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.rollNo) newErrors.rollNo = "Roll number is required";
    if (!formData.expNo) newErrors.expNo = "Experiment number is required";
    if (!formData.expTitle) newErrors.expTitle = "Experiment title is required";
    if (!formData.academicYear) newErrors.academicYear = "Academic year is required";
    if (!formData.aim) newErrors.aim = "Aim is required";
    if (!formData.procedure) newErrors.procedure = "Procedure is required";
    if (!formData.result) newErrors.result = "Result is required";
    if (programImages.length === 0) newErrors.programImages = "At least one program image is required";
    if (outputImages.length === 0) newErrors.outputImages = "At least one output image is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission (experiment generator) -- removed from UI

  // Generate PDF from form data with border and header box
  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const borderMargin = 5; // 5mm  border margin
      const contentMargin = 20; // 20mm content margin from border
      const contentWidth = pageWidth - (2 * (borderMargin + contentMargin));
      
      // Function to add border to each page
      const addPageBorder = () => {
        // Add border around the page
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(borderMargin, borderMargin, pageWidth - (2 * borderMargin), pageHeight - (2 * borderMargin));
      };
      
      // Function to add footer with page number and roll number
      // Function to draw the marks split-up table
      const drawMarksSplitUpTable = () => {
        // Set initial styles for the table
        pdf.setDrawColor(0); // Black border
        pdf.setLineWidth(0.1);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Table dimensions and positioning
        const tableWidth = 120; // mm
        const rowHeight = 7; // mm
        const colWidths = [40, 40, 40]; // Content, Max Marks, Marks Rewarded columns
        const tableX = (pageWidth - tableWidth) / 2; // Center the table horizontally
        let tableY = yPos;
        
        // Helper function for centering text in cells
        const centerTextInCell = (text, x, width, y) => {
          const textWidth = pdf.getStringUnitWidth(text) * 10 / pdf.internal.scaleFactor;
          const textX = x + (width - textWidth) / 2;
          pdf.text(text, textX, y + 5);
        };
        
        // For first year, use the splitup.png image instead of drawing the table
        if (formData.academicYear === '1') {
          // Set dimensions for the table image - adjust based on the actual image proportions
          const splitupImageWidth = 160; // mm - Width of the table image
          const splitupImageHeight = 70; // mm - Height adjusted based on image aspect ratio
          
          // Center the table horizontally
          const splitupTableX = (pageWidth - splitupImageWidth) / 2;
          
          try {
            // Add the splitup image to the PDF - you need to import this image at the top of the file
            // import splitupTable from '../assets/splitup.png';
            pdf.addImage(splitupTable, 'PNG', splitupTableX, tableY, splitupImageWidth, splitupImageHeight);
            
            // Update tableY position after adding the image
            tableY += splitupImageHeight;
          } catch (error) {
            console.error('Error adding splitup table image to PDF:', error);
            
            // Fallback if the image fails to load
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.1);
            pdf.rect(splitupTableX, tableY, splitupImageWidth, 30);
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text("Python Programming Lab Mark Splitup", splitupTableX + splitupImageWidth/2, tableY + 10, { align: 'center' });
            
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(10);
            pdf.text("Could not load marks splitup table image.", splitupTableX + splitupImageWidth/2, tableY + 20, { align: 'center' });
            
            tableY += 35; // Add some extra space
          }
        } else {
          // For non-first-year students, draw the standard table
          
          // Draw table header
          pdf.setFont('helvetica', 'bold');
          
          // Draw header cells
          pdf.rect(tableX, tableY, colWidths[0], rowHeight);
          pdf.rect(tableX + colWidths[0], tableY, colWidths[1], rowHeight);
          pdf.rect(tableX + colWidths[0] + colWidths[1], tableY, colWidths[2], rowHeight);
          
          // Add header text
          centerTextInCell('Content', tableX, colWidths[0], tableY);
          centerTextInCell('Max Marks', tableX + colWidths[0], colWidths[1], tableY);
          centerTextInCell('Marks Rewarded', tableX + colWidths[0] + colWidths[1], colWidths[2], tableY);
          
          tableY += rowHeight;
          
          // Draw table content based on academic year
          pdf.setFont('helvetica', 'normal');
          
          const rows = [
            ['Aim & Algorithm', '20', ''],
            ['Program Execution', '30', ''],
            ['Output', '30', ''],
            ['Result', '10', ''],
            ['Viva-voce', '10', ''],
            ['Total', '100', '']
          ];
          
          // Draw rows
          rows.forEach(row => {
            // Draw row cells
            pdf.rect(tableX, tableY, colWidths[0], rowHeight);
            pdf.rect(tableX + colWidths[0], tableY, colWidths[1], rowHeight);
            pdf.rect(tableX + colWidths[0] + colWidths[1], tableY, colWidths[2], rowHeight);
            
            // Add text
            pdf.text(row[0], tableX + 2, tableY + 5); // Left-aligned
            centerTextInCell(row[1], tableX + colWidths[0], colWidths[1], tableY); // Center-aligned
            // Marks rewarded column is left empty
            
            tableY += rowHeight;
          });
        }
        
        // Return the new Y position after the table
        return tableY + 10; // Add a margin after the table
      };
      
      const addFooter = (pageNum) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        
        // Add roll number on left side of footer
        pdf.text(`Roll No: ${formData.rollNo}`, borderMargin + 5, pageHeight - (borderMargin + 5));
        
        // Add "Page No:" on right side of footer without showing the actual page number
        pdf.text("Page No:", pageWidth - (borderMargin + 20), pageHeight - (borderMargin + 5));
        
        // Add timestamp and date in the center of the footer
        const currentDate = new Date();
        const dateString = currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const timeString = currentDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const timestampText = `Generated on: ${dateString} at ${timeString}`;
        
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100, 100, 100);
        pdf.text(timestampText, pageWidth / 2, pageHeight - (borderMargin + 5), { align: 'center' });
        
        // Add "Record generated by ipstechcommunity@kgkite.ac.in" at bottom left after the border
        pdf.setFontSize(5); // Smaller font size for the website label
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(120, 120, 120); // Lighter gray color
        pdf.text("Record generated by ipstechcommunity@kgkite.ac.in", 
                borderMargin + 5, // Position it near the left border
                pageHeight - 2); // Position it at the very bottom of the page
                
        // Add "co-Kreate your Genius" at bottom right with K and G in bold red
        pdf.setFontSize(5); // Same small font size
        
        // Instead of splitting the text into separate parts with manual positioning,
        // we'll use a more precise approach with measured text widths
        
        const rightTextX = pageWidth - borderMargin - 25; // Starting X position
        const bottomY = pageHeight - 2; // Y position at bottom
        
        // Create text sections with their specific styling
        const textSections = [
          { text: "co-", style: 'normal', color: [120, 120, 120] },
          { text: "K", style: 'bold', color: [0, 0, 0] },
          { text: "reate your ", style: 'normal', color: [120, 120, 120] },
          { text: "G", style: 'bold', color: [0, 0, 0] },
          { text: "enius", style: 'normal', color: [120, 120, 120] }
        ];
        
        // Draw each text section with proper styling
        let currentX = rightTextX;
        for (const section of textSections) {
          // Apply styling for this section
          pdf.setFont('helvetica', section.style);
          pdf.setTextColor(section.color[0], section.color[1], section.color[2]);
          
          // Draw the text at the current position
          pdf.text(section.text, currentX, bottomY);
          
          // Move position forward by the width of the text just drawn
          // Get the width of the text based on the current font style
          const textWidth = pdf.getStringUnitWidth(section.text) * 5 / pdf.internal.scaleFactor;
          currentX += textWidth;
        }
      };
      
      // Function to add header box (only for first page)
      const addHeaderBox = () => {
        // Header box - 40px (≈14mm) from top of border, 90% width, centered
        const headerBoxY = borderMargin + 14;
        const headerBoxWidth = (pageWidth - (2 * borderMargin)) * 0.9;
        const headerBoxX = (pageWidth - headerBoxWidth) / 2;
        const headerBoxHeight = 20; // 20mm height for header box
        
        // Draw header box border
        pdf.rect(headerBoxX, headerBoxY, headerBoxWidth, headerBoxHeight);
        
        // Left section (15% of header box width) for Exp.No and Date
        const leftSectionWidth = headerBoxWidth * 0.15;
        const rightSectionX = headerBoxX + leftSectionWidth;
        const rightSectionWidth = headerBoxWidth * 0.85;
        
        // Draw vertical line to separate left and right sections
        pdf.line(rightSectionX, headerBoxY, rightSectionX, headerBoxY + headerBoxHeight);
        
        // Draw horizontal line in left section to separate Exp.No and Date
        const leftSectionMidY = headerBoxY + (headerBoxHeight / 2);
        pdf.line(headerBoxX, leftSectionMidY, rightSectionX, leftSectionMidY);
        
        // Add text in left section
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        // Exp.No text (top half of left section)
        const expNoY = headerBoxY + 6;
        pdf.text(`Exp.No: ${formData.expNo}`, headerBoxX + 2, expNoY);
        
        // Date text (bottom half of left section) - empty value
        const dateY = leftSectionMidY + 6;
        pdf.text("Date:", headerBoxX + 2, dateY);
        
        // Title text (right section) - bold and centered
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const titleY = headerBoxY + (headerBoxHeight / 2) + 2;
        const titleText = pdf.splitTextToSize(formData.expTitle, rightSectionWidth - 4);
        
        // Center the title text
        const titleX = rightSectionX + (rightSectionWidth / 2);
        pdf.text(titleText, titleX, titleY, { align: "center", maxWidth: rightSectionWidth - 4 });
        
        return headerBoxY + headerBoxHeight + 10; // Return Y position after header
      };
      
      // Add border and header to first page only
      addPageBorder();
      let yPos = addHeaderBox();
      const leftMargin = borderMargin + contentMargin;
      
      // Add main content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      // Aim
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Set text color to black
      pdf.text("Aim:", leftMargin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
      
      // Handle multiline text wrapping
      const splitAim = pdf.splitTextToSize(formData.aim, contentWidth);
      pdf.setTextColor(0, 0, 0); // Ensure text color is black for content
      pdf.text(splitAim, leftMargin, yPos);
      yPos += splitAim.length * 7 + 25; // Added extra 15mm space before Procedure
      
      // Procedure
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Set text color to black
      pdf.text("Procedure:", leftMargin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
      
      const splitProcedure = pdf.splitTextToSize(formData.procedure, contentWidth);
      pdf.text(splitProcedure, leftMargin, yPos);
      
      // Initialize page counter
      let currentPage = 1;
      
      // Always start Program section on a new page
      addFooter(currentPage); // Add footer to current page
      pdf.addPage();
      currentPage++;
      addPageBorder(); // Add border to new page
      yPos = borderMargin + contentMargin; // Reset Y position to start of new page
      
      // Program Images
      pdf.setFontSize(12); // Ensure consistent font size with other headings
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Set text color to black
      pdf.text("Program:", leftMargin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
      
      // Add multiple program images with their actual dimensions
      for (let i = 0; i < programImages.length; i++) {
        // Create temporary image to get original dimensions
        const img = new Image();
        img.src = programImages[i];
        
        // Use original image dimensions (converted from pixels to mm)
        // Standard conversion: 1 pixel ≈ 0.264583 mm
        const pxToMm = 0.264583;
        const imgWidth = img.width * pxToMm;
        const imgHeight = img.height * pxToMm;
        
        // Calculate available space for image
        const availableHeight = pageHeight - (2 * borderMargin) - (2 * contentMargin);
        const maxImageHeight = Math.min(availableHeight * 0.8, 160); // Max 80% of available height or 160mm
        
        // Determine final dimensions to fit within page
        let finalImgWidth = imgWidth;
        let finalImgHeight = imgHeight;
        
        // Scale down if image is wider than content width
        if (imgWidth > contentWidth) {
          finalImgWidth = contentWidth;
          finalImgHeight = (imgHeight * contentWidth) / imgWidth;
        }
        
        // Further scale down if image is still too tall
        if (finalImgHeight > maxImageHeight) {
          finalImgWidth = (finalImgWidth * maxImageHeight) / finalImgHeight;
          finalImgHeight = maxImageHeight;
        }
        
        // Check if we need a new page
        if (yPos + finalImgHeight > pageHeight - borderMargin - contentMargin) {
          addFooter(currentPage); // Add footer to current page before adding a new one
          pdf.addPage();
          currentPage++;
          addPageBorder(); // Add only border to new page
          yPos = borderMargin + contentMargin; // Start content after border margin
        }
        
        // Calculate horizontal centering if image is smaller than content width
        const xOffset = finalImgWidth < contentWidth ? (contentWidth - finalImgWidth) / 2 : 0;
        
        pdf.addImage(programImages[i], 'JPEG', leftMargin + xOffset, yPos, finalImgWidth, finalImgHeight);
        yPos += finalImgHeight + 5; // Add a small space after image
      }
      
      // Output Images - Always start on a new page
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Set text color to black
      
      // Always create a new page for output section
      addFooter(currentPage); // Add footer to current page
      pdf.addPage();
      currentPage++;
      addPageBorder(); // Add border to new page
      yPos = borderMargin + contentMargin; // Reset Y position to start of new page
      
      // Output heading
      pdf.setFontSize(12); // Ensure consistent font size with other headings
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Set text color to black
      pdf.text("Output:", leftMargin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
      
      // Add multiple output images with their actual dimensions
      for (let i = 0; i < outputImages.length; i++) {
        // Create temporary image to get original dimensions
        const img = new Image();
        img.src = outputImages[i];
        
        // Use original image dimensions (converted from pixels to mm)
        // Standard conversion: 1 pixel ≈ 0.264583 mm
        const pxToMm = 0.264583;
        const imgWidth = img.width * pxToMm;
        const imgHeight = img.height * pxToMm;
        
        // Calculate available space for image
        const availableHeight = pageHeight - (2 * borderMargin) - (2 * contentMargin);
        const maxImageHeight = Math.min(availableHeight * 0.8, 160); // Max 80% of available height or 160mm
        
        // Determine final dimensions to fit within page
        let finalImgWidth = imgWidth;
        let finalImgHeight = imgHeight;
        
        // Scale down if image is wider than content width
        if (imgWidth > contentWidth) {
          finalImgWidth = contentWidth;
          finalImgHeight = (imgHeight * contentWidth) / imgWidth;
        }
        
        // Further scale down if image is still too tall
        if (finalImgHeight > maxImageHeight) {
          finalImgWidth = (finalImgWidth * maxImageHeight) / finalImgHeight;
          finalImgHeight = maxImageHeight;
        }
        
        // Check if we need a new page
        if (yPos + finalImgHeight > pageHeight - borderMargin - contentMargin) {
          addFooter(currentPage); // Add footer to current page
          pdf.addPage();
          currentPage++;
          addPageBorder(); // Add only border to new page
          yPos = borderMargin + contentMargin; // Start content after border margin
        }
        
        // Calculate horizontal centering if image is smaller than content width
        const xOffset = finalImgWidth < contentWidth ? (contentWidth - finalImgWidth) / 2 : 0;
        
        pdf.addImage(outputImages[i], 'JPEG', leftMargin + xOffset, yPos, finalImgWidth, finalImgHeight);
        yPos += finalImgHeight + 5; // Add a small space after image
      }
      
      // Calculate space needed for result text
      const splitResult = pdf.splitTextToSize(formData.result, contentWidth);
      
      // Always start marks split-up and result on a new page
      addFooter(currentPage); // Add footer to current page
      pdf.addPage();
      currentPage++;
      addPageBorder(); // Add border to new page
      
      // Start marks split-up from the top of the page
      let currentYPos = borderMargin + contentMargin;
      
      // Add marks split-up table title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text("Marks Split-up:", leftMargin, currentYPos);
      pdf.setFont('helvetica', 'normal');
      currentYPos += 10;
      
      // Draw the marks split-up table
      yPos = currentYPos;
      const tableEndY = drawMarksSplitUpTable();
      
      // Position result at the BOTTOM of the page
      // Calculate how much space the result text will need
      const resultTextHeight = splitResult.length * 7 + 15; // Text height plus spacing
      
      // Position result section at bottom of page with margin
      let resultYPos = pageHeight - (borderMargin + contentMargin) - resultTextHeight;
      
      // If result is too large, position it below the table instead
      if (resultTextHeight > pageHeight / 3) {
        resultYPos = tableEndY + 20;
      }
      
      // Result title - only show this ONCE
      pdf.setFontSize(12); 
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); 
      pdf.text("Result:", leftMargin, resultYPos);
      pdf.setFont('helvetica', 'normal');
      resultYPos += 7; // For result content
      
      // Check if there's enough space for the result content
      if (resultYPos + splitResult.length * 7 > pageHeight - (borderMargin + contentMargin)) {
        // Not enough space, add a new page
        addFooter(currentPage);
        pdf.addPage();
        currentPage++;
        addPageBorder();
        resultYPos = borderMargin + contentMargin;
      }
      
      // Result content
      pdf.text(splitResult, leftMargin, resultYPos);
      
      // Add footer to result page
      addFooter(currentPage);
      
      // Save PDF
      pdf.save(`Experiment_${formData.rollNo}_${formData.expNo}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      // Reset the form after PDF generation (whether successful or not)
      resetForm();
      
      // Reset the state variables
      setIsGeneratingPdf(false);
      setIsSubmitting(false);
    }
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

      // Header area (logo left + institute text centered + doc ref box right)
      const headerY = margin + 6;
      try {
        if (logo) {
          // try adding logo (may be webp/png depending on bundler)
          pdf.addImage(logo, 'PNG', margin + 4, headerY - 2, 28, 18);
        }
      } catch (e) {
        // ignore image errors
      }

      // Institute name block centered
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KGISL INSTITUTE OF TECHNOLOGY,', pageWidth / 2, headerY + 2, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('COIMBATORE -35, TN, INDIA', pageWidth / 2, headerY + 8, { align: 'center' });

      // Small table at top-right for Doc.Ref and Issue No/Date
      const rightBoxW = 52;
      const rightBoxX = pageWidth - margin - rightBoxW;
      const rightBoxY = margin + 4;
      pdf.setFontSize(8);
      pdf.rect(rightBoxX, rightBoxY, rightBoxW, 18);
      pdf.text('Doc. Ref.', rightBoxX + 4, rightBoxY + 5);
      pdf.text('KITE/AC/AL/ 75', rightBoxX + 4, rightBoxY + 11);
      pdf.text('Issue No / Date', rightBoxX + 4, rightBoxY + 15);
      // Use current date for issue date
      const now = new Date();
      const issueDate = now.toLocaleDateString('en-GB');
      pdf.text(issueDate, rightBoxX + rightBoxW - 6, rightBoxY + 15, { align: 'right' });

      // Title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EVENT APPROVAL LETTER', pageWidth / 2, headerY + 28, { align: 'center' });

      // Date on right (use current date)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${issueDate}`, pageWidth - margin - 30, headerY + 36);

      // From / Through / To table
      const tableY = headerY + 44;
      const tableX = margin + 10;
      const tableW = pageWidth - margin * 2 - 20;
      const colW = tableW / 3;

      pdf.setLineWidth(0.4);
      pdf.rect(tableX, tableY, tableW, 28);
      // vertical separators
      pdf.line(tableX + colW, tableY, tableX + colW, tableY + 28);
      pdf.line(tableX + colW * 2, tableY, tableX + colW * 2, tableY + 28);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('From', tableX + colW / 2, tableY + 8, { align: 'center' });
      pdf.text('Through', tableX + colW + colW / 2, tableY + 8, { align: 'center' });
      pdf.text('To', tableX + colW * 2 + colW / 2, tableY + 8, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      const fromText = pdf.splitTextToSize(approvalData.from || '', colW - 6);
      const throughText = pdf.splitTextToSize(approvalData.through || '', colW - 6);
      const toText = pdf.splitTextToSize(approvalData.to || '', colW - 6);
      pdf.text(fromText, tableX + 3, tableY + 14);
      pdf.text(throughText, tableX + colW + 3, tableY + 14);
      pdf.text(toText, tableX + colW * 2 + 3, tableY + 14);

      // Subject area and body
      const subjY = tableY + 38;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Sub :', tableX, subjY + 4);
      // small subject line above the box
      pdf.setFont('helvetica', 'bold');
      pdf.text(approvalData.subject || '', tableX + 18, subjY + 4);
      pdf.setFont('helvetica', 'normal');
      const subjBoxY = subjY + 8;
      const subjBoxH = 80;
      pdf.rect(tableX, subjBoxY, tableW, subjBoxH);
      const bodyText = pdf.splitTextToSize(approvalData.body || '', tableW - 6);
      pdf.text(bodyText, tableX + 3, subjBoxY + 8);

      // Event Budget table near bottom
      pdf.setFont('helvetica', 'bold');
      pdf.text('Event Budget', pageWidth / 2, pageHeight - 70, { align: 'center' });

      const budgetW = 120;
      const budgetX = (pageWidth - budgetW) / 2;
      const budgetY = pageHeight - 64;
      const rowH = 8;
      const col1 = 18; // S.No
      const col2 = 72; // Particulars
      const col3 = budgetW - col1 - col2; // Amount

      // header row
      pdf.setLineWidth(0.3);
      pdf.rect(budgetX, budgetY, budgetW, rowH);
      pdf.rect(budgetX, budgetY + rowH, budgetW, rowH);
      pdf.rect(budgetX, budgetY + rowH * 2, budgetW, rowH);
      pdf.rect(budgetX, budgetY + rowH * 3, budgetW, rowH);
      pdf.rect(budgetX + budgetW - 40, budgetY + rowH * 3, 40, rowH); // total amount cell

      // column separators
      pdf.line(budgetX + col1, budgetY, budgetX + col1, budgetY + rowH * 4);
      pdf.line(budgetX + col1 + col2, budgetY, budgetX + col1 + col2, budgetY + rowH * 4);

      // header texts
      pdf.setFontSize(9);
      pdf.text('S.No', budgetX + col1 / 2, budgetY + 6, { align: 'center' });
      pdf.text('Particulars', budgetX + col1 + 6, budgetY + 6);
      pdf.text('Amount', budgetX + col1 + col2 + 20, budgetY + 6);

      // fill rows from approvalData.particulars
      pdf.setFont('helvetica', 'normal');
      let total = 0;
      for (let i = 0; i < approvalData.particulars.length; i++) {
        const p = approvalData.particulars[i] ? approvalData.particulars[i].particular : '';
        const a = approvalData.particulars[i] ? approvalData.particulars[i].amount : '';
        pdf.text(`${i + 1}.`, budgetX + 4, budgetY + rowH * (i + 1) + 6);
        pdf.text(p || '', budgetX + col1 + 6, budgetY + rowH * (i + 1) + 6);
        pdf.text(a ? `₹ ${a}` : '₹', budgetX + col1 + col2 + 6, budgetY + rowH * (i + 1) + 6);
        const num = parseFloat(String(a).replace(/,/g, '')) || 0;
        total += num;
      }

      // Total row
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', budgetX + col1 + 6, budgetY + rowH * 4 - 2);
      pdf.text(`₹ ${total.toFixed(2)}`, budgetX + budgetW - 6, budgetY + rowH * 4 - 2, { align: 'right' });

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
    setFormData({
      rollNo: '',
      expNo: '',
      expTitle: '',
      academicYear: '1',
      aim: '',
      procedure: '',
      result: ''
    });
    setProgramImages([]);
    setOutputImages([]);
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
                  <h2 className="text-2xl font-bold text-blue-900 tracking-tight">Record Generator</h2>
                  <div className="flex items-center mt-1">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></div>
                    <p className="text-black-600 text-sm font-medium">co-<span className="text-red-600">K</span>reate your <span className="text-red-600">G</span>enius</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <a href="https://pyexpo.co/" target="_blank" rel="noopener noreferrer" className="bg-white p-3 rounded-lg shadow-md border border-blue-100 transition-all hover:shadow-lg hover:border-blue-200 hover:scale-105">
                  <img 
                    src={pyExpoLogo} 
                    alt="Python Expo Logo" 
                    className="h-12 w-auto object-contain"
                  />
                </a>
                <a href="https://ips-community.netlify.app/" target="_blank" rel="noopener noreferrer" className="bg-white p-3 rounded-lg shadow-md border border-blue-100 transition-all hover:shadow-lg hover:border-blue-200 hover:scale-105">
                  <img 
                    src={techCommunityLogo} 
                    alt="Tech Community Logo" 
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
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">IPS TECH</h3>
              </div>
            
              {/* Social Links */}
              <div className="flex items-center space-x-4">
                {/* GitHub */}
                <a href="https://github.com/Kite-IPS" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                
                {/* LinkedIn */}
                <a href="https://lnkd.in/gZdPmjSB" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                
                {/* Instagram */}
                <a href="https://www.instagram.com/ips_tech.community?igsh=MXNkdndoNzV6YWM3" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                
                {/* Gmail */}
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=ipstechcommunity@kgkite.ac.in" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-600 text-sm mb-4 md:mb-0">
                  © {new Date().getFullYear()} IPS Tech Community. All rights reserved.
                </p>
                <p className="text-gray-500 text-sm">
                  Made with <span className="text-blue-600">❤</span> by IPS Tech
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