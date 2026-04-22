// FrontendTeacher/src/utils/exportUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ==================== TOP HELPERS ====================

const getGroupedQuestions = (questions) => {
  const groups = {
    'Section A: Short Answer (2 marks)': [],
    'Section B: Medium Answer (5 marks)': [],
    'Section C: Long Answer (10 marks)': []
  };

  questions.forEach(q => {
    const section = q.section?.toLowerCase() || '';
    const m = Number(q.marks) || 0;
    
    // Strict Label-First Sorting
    if (section.includes('section b')) {
      groups['Section B: Medium Answer (5 marks)'].push({ ...q, marks: 5 }); // ENFORCE 5 MARKS
    } else if (section.includes('section c')) {
      groups['Section C: Long Answer (10 marks)'].push({ ...q, marks: 10 }); // ENFORCE 10 MARKS
    } else if (section.includes('section a')) {
      groups['Section A: Short Answer (2 marks)'].push({ ...q, marks: 2 }); // ENFORCE 2 MARKS
    } else {
      // Fallback to marks ONLY if section name is missing
      if (m < 5) groups['Section A: Short Answer (2 marks)'].push({ ...q, marks: 2 });
      else if (m >= 5 && m < 10) groups['Section B: Medium Answer (5 marks)'].push({ ...q, marks: 5 });
      else groups['Section C: Long Answer (10 marks)'].push({ ...q, marks: 10 });
    }
  });

  return groups;
};

const formatExportQNo = (label, defaultNo) => {
  if (!label) return `Question ${defaultNo}`;
  if (label.toLowerCase().startsWith('q')) return label;
  if (label.toLowerCase().startsWith('question')) return label;
  return `Question ${label}`;
};

// ==================== QUIZ EXPORT ====================

export const exportQuizToExcel = (quiz) => {
  try {
    const data = [];
    data.push(['Quiz Title', quiz.title]);
    data.push(['Total Questions', quiz.questions.length]);
    data.push(['Status', quiz.status]);
    data.push([]);
    data.push(['Q.No', 'Question', 'Option A', 'Option B', 'Option C', 'Option D']);
    
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

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz');
    XLSX.writeFile(wb, `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_Quiz.xlsx`);

    return { success: true, message: 'Quiz exported to Excel successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportQuizToPDF = (quiz) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(quiz.title, 14, 20);
    
    let y = 35;
    quiz.questions.forEach((q, index) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Question ${index + 1}:`, 14, y);
      
      doc.setFont(undefined, 'normal');
      const questionLines = doc.splitTextToSize(q.question, 180);
      doc.text(questionLines, 14, y + 6);
      y += 6 + (questionLines.length * 6);
      
      doc.setFontSize(10);
      q.options.forEach((option, optIndex) => {
        const optionLetter = String.fromCharCode(65 + optIndex);
        const optionLines = doc.splitTextToSize(`${optionLetter}. ${option}`, 170);
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(optionLines, 20, y);
        y += 6 * optionLines.length;
      });
      y += 12;
    });
    
    doc.save(`${quiz.title.replace(/[^a-z0-9]/gi, '_')}_Quiz.pdf`);
    return { success: true, message: 'Quiz exported to PDF successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to PDF' };
  }
};

// ==================== TEST PAPER EXPORT ====================

export const exportTestPaperToExcel = (testPaper) => {
  try {
    const data = [];
    data.push(['Test Paper Title', testPaper.title]);
    data.push(['Total Marks', testPaper.totalMarks]);
    data.push([]);

    const groups = getGroupedQuestions(testPaper.questions);

    Object.entries(groups).forEach(([sectionTitle, qs]) => {
      if (qs.length === 0) return;
      
      data.push([sectionTitle.toUpperCase()]);
      data.push(['Q.No', 'Marks', 'Question']);
      
      qs.forEach((q, idx) => {
        data.push([
          formatExportQNo(q.choiceLabel, idx + 1),
          q.marks, // This now reflects the enforced section mark
          q.question
        ]);
      });
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Paper');
    XLSX.writeFile(wb, `${testPaper.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);

    return { success: true, message: 'Test Paper exported to Excel successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportTestPaperToPDF = (testPaper) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(testPaper.title, 14, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Marks: ${testPaper.totalMarks}`, 14, 28);
    
    let y = 40;
    const groups = getGroupedQuestions(testPaper.questions);

    Object.entries(groups).forEach(([sectionTitle, qs]) => {
      if (qs.length === 0) return;

      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(70, 70, 70);
      doc.text(sectionTitle, 14, y);
      doc.line(14, y + 2, 100, y + 2);
      y += 12;

      qs.forEach((q, idx) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${formatExportQNo(q.choiceLabel, idx + 1)} [${q.marks} Marks]`, 14, y); // Enforced mark
        y += 7;

        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(q.question, 180);
        doc.text(lines, 14, y);
        y += (lines.length * 6) + 8;
      });
      y += 5;
    });
    
    doc.save(`${testPaper.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    return { success: true, message: 'Test Paper exported to PDF successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to PDF' };
  }
};

// ==================== ASSIGNMENT EXPORT ====================

export const exportAssignmentToExcel = (assignment) => {
  try {
    const data = [];
    data.push(['Assignment Title', assignment.title]);
    data.push(['Total Marks', assignment.totalMarks]);
    data.push([]);
    data.push(['Q.No', 'Marks', 'Question']);
    
    assignment.questions.forEach((q, index) => {
      data.push([
        index + 1,
        q.marks,
        q.question
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assignment');
    XLSX.writeFile(wb, `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_Assignment.xlsx`);

    return { success: true, message: 'Assignment exported to Excel successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to Excel' };
  }
};

export const exportAssignmentToPDF = (assignment) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(assignment.title, 14, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Marks: ${assignment.totalMarks}`, 14, 30);
    
    let y = 50;
    assignment.questions.forEach((q, index) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Question ${index + 1} [${q.marks} marks]`, 14, y);
      y += 8;
      
      doc.setFont(undefined, 'normal');
      const questionLines = doc.splitTextToSize(q.question, 180);
      doc.text(questionLines, 14, y);
      y += 6 * questionLines.length + 12;
    });
    
    doc.save(`${assignment.title.replace(/[^a-z0-9]/gi, '_')}_Assignment.pdf`);
    return { success: true, message: 'Assignment exported to PDF successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export to PDF' };
  }
};