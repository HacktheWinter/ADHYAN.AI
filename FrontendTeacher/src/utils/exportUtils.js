// FrontendTeacher/src/utils/exportUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ==================== QUIZ EXPORT ====================

export const exportQuizToExcel = (quiz) => {
  try {
    // Prepare data for Excel
    const data = [];
    
    // Add header row
    data.push(['Quiz Title', quiz.title]);
    data.push(['Total Questions', quiz.questions.length]);
    data.push(['Status', quiz.status]);
    data.push([]); // Empty row
    
    // Add questions header (removed Correct Answer column)
    data.push(['Q.No', 'Question', 'Option A', 'Option B', 'Option C', 'Option D']);
    
    // Add questions (without correct answer)
    quiz.questions.forEach((q, index) => {
      data.push([
        index + 1,
        q.question,
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || ''
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Q.No
      { wch: 50 }, // Question
      { wch: 25 }, // Option A
      { wch: 25 }, // Option B
      { wch: 25 }, // Option C
      { wch: 25 }  // Option D
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz');

    // Generate file
    const fileName = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_Quiz.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, message: 'Quiz exported to Excel successfully!' };
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportQuizToPDF = (quiz) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(quiz.title, 14, 20);
    
    // Add metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Questions: ${quiz.questions.length}`, 14, 30);
    doc.text(`Status: ${quiz.status}`, 14, 36);
    
    let yPosition = 50;
    
    // Add questions (without correct answer)
    quiz.questions.forEach((q, index) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Question number and text
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Question ${index + 1}:`, 14, yPosition);
      
      doc.setFont(undefined, 'normal');
      const questionLines = doc.splitTextToSize(q.question, 180);
      doc.text(questionLines, 14, yPosition + 6);
      yPosition += 6 + (questionLines.length * 6);
      
      // Options
      doc.setFontSize(10);
      q.options.forEach((option, optIndex) => {
        const optionLetter = String.fromCharCode(65 + optIndex);
        const optionLines = doc.splitTextToSize(`${optionLetter}. ${option}`, 170);
        
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(optionLines, 20, yPosition);
        yPosition += 6 * optionLines.length;
      });
      
      // Removed correct answer section
      
      yPosition += 12; // Space before next question
    });
    
    // Save PDF
    const fileName = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_Quiz.pdf`;
    doc.save(fileName);

    return { success: true, message: 'Quiz exported to PDF successfully!' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: 'Failed to export to PDF' };
  }
};

// ==================== TEST PAPER EXPORT ====================

export const exportTestPaperToExcel = (testPaper) => {
  try {
    const data = [];
    
    // Add header
    data.push(['Test Paper Title', testPaper.title]);
    data.push(['Total Questions', testPaper.questions.length]);
    data.push(['Total Marks', testPaper.totalMarks]);
    data.push(['Status', testPaper.status]);
    data.push([]); // Empty row
    
    // Add questions header (removed Answer Key and Guidelines)
    data.push(['Q.No', 'Type', 'Marks', 'Question']);
    
    // Add questions (without answer key and guidelines)
    testPaper.questions.forEach((q, index) => {
      data.push([
        index + 1,
        q.type,
        q.marks,
        q.question
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Q.No
      { wch: 10 }, // Type
      { wch: 8 },  // Marks
      { wch: 70 }  // Question
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Paper');

    // Generate file
    const fileName = `${testPaper.title.replace(/[^a-z0-9]/gi, '_')}_TestPaper.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, message: 'Test Paper exported to Excel successfully!' };
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportTestPaperToPDF = (testPaper) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(testPaper.title, 14, 20);
    
    // Add metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Questions: ${testPaper.questions.length}`, 14, 30);
    doc.text(`Total Marks: ${testPaper.totalMarks}`, 14, 36);
    doc.text(`Status: ${testPaper.status}`, 14, 42);
    
    let yPosition = 55;
    
    // Add questions (without answer key and guidelines)
    testPaper.questions.forEach((q, index) => {
      // Check if we need a new page
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Question header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Question ${index + 1} [${q.marks} marks] - ${q.type}`, 14, yPosition);
      yPosition += 8;
      
      // Question text
      doc.setFont(undefined, 'normal');
      const questionLines = doc.splitTextToSize(q.question, 180);
      doc.text(questionLines, 14, yPosition);
      yPosition += 6 * questionLines.length + 6;
      
      // Removed Answer Key section
      // Removed Guidelines section
      
      yPosition += 8; // Space before next question
    });
    
    // Save PDF
    const fileName = `${testPaper.title.replace(/[^a-z0-9]/gi, '_')}_TestPaper.pdf`;
    doc.save(fileName);

    return { success: true, message: 'Test Paper exported to PDF successfully!' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: 'Failed to export to PDF' };
  }
};

// ==================== ASSIGNMENT EXPORT ====================

export const exportAssignmentToExcel = (assignment) => {
  try {
    const data = [];
    
    // Add header
    data.push(['Assignment Title', assignment.title]);
    data.push(['Description', assignment.description || '']);
    data.push(['Total Questions', assignment.questions.length]);
    data.push(['Total Marks', assignment.totalMarks]);
    data.push(['Status', assignment.status]);
    data.push([]); // Empty row
    
    // Add questions header (removed Answer Key and Guidelines)
    data.push(['Q.No', 'Marks', 'Question']);
    
    // Add questions (without answer key and guidelines)
    assignment.questions.forEach((q, index) => {
      data.push([
        index + 1,
        q.marks,
        q.question
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Q.No
      { wch: 8 },  // Marks
      { wch: 80 }  // Question
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assignment');

    // Generate file
    const fileName = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_Assignment.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, message: 'Assignment exported to Excel successfully!' };
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportAssignmentToPDF = (assignment) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(assignment.title, 14, 20);
    
    // Add description
    if (assignment.description) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      const descLines = doc.splitTextToSize(assignment.description, 180);
      doc.text(descLines, 14, 28);
    }
    
    // Add metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const metaY = assignment.description ? 38 : 30;
    doc.text(`Total Questions: ${assignment.questions.length}`, 14, metaY);
    doc.text(`Total Marks: ${assignment.totalMarks}`, 14, metaY + 6);
    doc.text(`Status: ${assignment.status}`, 14, metaY + 12);
    
    let yPosition = metaY + 25;
    
    // Add questions (without answer key and guidelines)
    assignment.questions.forEach((q, index) => {
      // Check if we need a new page
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Question header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Question ${index + 1} [${q.marks} marks]`, 14, yPosition);
      yPosition += 8;
      
      // Question text
      doc.setFont(undefined, 'normal');
      const questionLines = doc.splitTextToSize(q.question, 180);
      doc.text(questionLines, 14, yPosition);
      yPosition += 6 * questionLines.length + 6;
      
      // Removed Answer Key section
      // Removed Guidelines section
      
      yPosition += 8; // Space before next question
    });
    
    // Save PDF
    const fileName = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_Assignment.pdf`;
    doc.save(fileName);

    return { success: true, message: 'Assignment exported to PDF successfully!' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: 'Failed to export to PDF' };
  }
};