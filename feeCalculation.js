// load data from json files
let feeData = [];
let holidays = [];
let tableHtml = null;

async function loadJSONData() {
    feeData = JSON.parse(import.meta.env.VITE_feeData);
    holidays = JSON.parse(import.meta.env.VITE_holidays);
    holidays = [...holidays.gazettedHolidays, ...holidays.centerHolidays];
}
loadJSONData().then(() => {
    document.getElementById('generate').addEventListener('click', generateFeeDetails);
});

function generateFeeDetails() {
    console.log("Generate button clicked.");
    // Get form values
    const year = parseInt(document.getElementById('year').value, 10);
    const level = document.getElementById('level').value;
    const subject = document.getElementById('subject').value;
    const day = document.getElementById('day').value;
    const teacher = document.getElementById('teacher').value;
    const timeslot = document.getElementById('timeslot').value;
    const paymentFrequency = parseInt(document.getElementById('paymentFrequency').value, 10);
    // console.log('payment freq', paymentFrequency);
    const studentType = document.getElementById('studentType').value;
    const classType = document.getElementById('classType').value;
    const additionalNote = document.getElementById('additionalNote').value;
    const newStudentNoteEle = document.getElementById('newStudentNote');
    const addNoteEle = document.getElementById('addNote');
    if (additionalNote != '') {
        addNoteEle.innerText = `Additional note: ${additionalNote}`;
        addNoteEle.style.visibility = 'visible';
    }
    if (studentType == "new") {
        newStudentNoteEle.style.display = "block";
    }
    else {
        newStudentNoteEle.style.display = "none";
    }
    // Fetch the fee details for the selected level
    const levelFees = feeData.find(item => Object.keys(item)[0] === level);
    if (!levelFees) {
        console.error('Level not found:', level);
        alert('Selected level does not exist.');
        return;
    }

    // Fee variations
    let tuitionFeePerLesson = levelFees[level][0];  // base fee 
    if (classType == "one-to-one") { // one-to-one fee
        tuitionFeePerLesson = levelFees[level][1];
    }
    if (subject == "Cl+Hcl" && (level == 'p5' || level == 'p6')) {  // cl+hcl duo subject fee
        for (const item of feeData) {
            if (item.hasOwnProperty("Cl+Hcl")) {
                tuitionFeePerLesson = item["Cl+Hcl"];
            }
        }
    }
    if (studentType == 'new' && level == 's4') { // s4 new students fee
        for (const item of feeData) {
            if (item.hasOwnProperty("2025-new")) {
                tuitionFeePerLesson = item["2025-new"];
            }
        }
    }
    if ((subject == 'Hcl' || subject == 'amath') && level == 's4') { // s4 hcl fee
        for (const item of feeData) {
            if (item.hasOwnProperty("2025-new")) {
                tuitionFeePerLesson = item["2025-new"];
            }
        }
    }
    if ((subject == "Hcl") && (level == 'p5' || level == 'p6')) {
        tuitionFeePerLesson = 65;
    }

    let materialFeePerMonth = levelFees[level][2]; // base material fee 
    if (classType == 'one-to-one' || paymentFrequency > 3) { // no material fee for some people
        materialFeePerMonth = 0;
    }

    // Generate output title and teacher info
    document.getElementById('outputTitle').textContent = `Tuition Fee Payment Details ${year} - ${level.toUpperCase()} ${subject.toUpperCase()}`;
    document.getElementById('teacherInfo').textContent = `Teacher in charge: ${teacher} | Day & Time: ${day.toUpperCase()} ${timeslot}`;

    // Prepare table for monthly data
    const feeTable = document.getElementById('feeTable');
    tableHtml = generateMonthlyTable(year, day, tuitionFeePerLesson, materialFeePerMonth, paymentFrequency);
    if (!tableHtml) {
        console.error('Failed to generate table HTML.');
        alert('There was an error generating the table.');
        return;
    }

    // Set table HTML and ensure it's displayed
    feeTable.innerHTML = tableHtml;

    // Show the output container and enable PDF download button
    document.getElementById('outputContainer').classList.remove('hidden');
    document.getElementById('downloadPdf').addEventListener('click', downloadAsPDF);
    document.getElementById('downloadPdf').classList.remove('hidden');
    document.getElementById('downloadExcel').addEventListener('click', downloadAsExcel);
    document.getElementById('downloadExcel').classList.remove('hidden');
}

// Helper function to generate the monthly fee table
function generateMonthlyTable(year, day, tuitionFeePerLesson, materialFeePerMonth, paymentFrequency) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const tableHtml = `
        <table class="min-w-full border border-gray-300">
            <thead>
                <tr>
                    <th class="p-2 border bg-gray-100"></th>
                    ${months.map(month => `<th class="p-2 border bg-gray-100">${month}-${year.toString().slice(-2)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr><td class="p-2 border">Dates with Lessons 上课日期</td>${months.map(month => `<td class="p-2 border">${getLessonDates(month, year, day).join(', ')}</td>`).join('')}</tr>
                <tr><td class="p-2 border">Dates on Break 休息日期</td>${months.map(month => `<td class="p-2 border">${getHolidayDates(month, year, day).join(', ')}</td>`).join('')}</tr>
                <tr><td class="p-2 border">Number of Lessons 课程数</td>${months.map(month => `<td class="p-2 border">${calculateLessonCount(month, year, day)}</td>`).join('')}</tr>
                <tr><td class="p-2 border">Tuition Fee per Lesson 每节课学费</td>${months.map(month => `<td class="p-2 border">${tuitionFeePerLesson}</td>`).join('')}</tr>
               <tr><td class="p-2 border">Material Fee per Month 材料费</td><td class="p-2 border text-center" colspan="${months.length}">${materialFeePerMonth}</td></tr>
                <tr><td class="p-2 border">Calculated Fee per Month 计算月学费</td>${months.map(month => `<td class="p-2 border">${calculateMonthlyFee(month, year, tuitionFeePerLesson, materialFeePerMonth, day)}</td>`).join('')}</tr>
                <tr><td class="p-2 border">Total Fee 总学费 </td>${generateTotalFeeRow(months, year, tuitionFeePerLesson, materialFeePerMonth, day, paymentFrequency)}</tr>
            </tbody>
        </table>
    `;
    return tableHtml;
}

// Function to get lesson dates for a specific month and day, + exclude the holiday dates
function getLessonDates(month, year, day) {
    // Map month name to index (0-based for Date object)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(month);

    // Map day names to 0-based indices for weekdays (0=Sunday, 1=Monday, etc.)
    const dayMap = {
        "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6
    };
    const targetDay = dayMap[day.toLowerCase()];
    const lessonDates = [];
    const date = new Date(year, monthIndex, 1);  // Start on the first of the given month

    while (date.getMonth() === monthIndex) {
        if (date.getDay() === targetDay) {
            // Format date as 'YYYY-MM-DD' for comparison
            const formattedLessonDate = `${date.getDate()}/${monthIndex + 1}`;  // Format as 'day/month'
            if (!getHolidayDates(month, year, day).includes(formattedLessonDate)) {
                lessonDates.push(formattedLessonDate);
            }
            else {
                // console.log(`Excluding holiday date: ${formattedLessonDate}`); 
                // Log if it's excluded
            }
        }
        date.setDate(date.getDate() + 1);  // Move to the next day
    }

    return lessonDates;
}

// Function to get holiday dates for a specific month and day
function getHolidayDates(month, year, day) {
    const holidayDates = [];

    // Map month name to index (0-based)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(month);

    // Map day names to 0-based indices for weekdays (0=Sunday, 1=Monday, etc.)
    const dayMap = {
        "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6
    };
    const targetDay = dayMap[day.toLowerCase()];

    // Loop through holidays
    holidays.forEach(holiday => {
        const holidayDate = new Date(holiday); // Convert holiday string to Date object
        if (holidayDate.getFullYear() === year && holidayDate.getMonth() === monthIndex) {
            // Check if the holiday falls on the target day
            if (holidayDate.getDay() === targetDay) {
                const formattedHolidayDate = `${holidayDate.getDate()}/${monthIndex + 1}`; // Format as 'day/month'
                if (!holidayDates.includes(formattedHolidayDate)) holidayDates.push(formattedHolidayDate);

            }
        }
    });

    return holidayDates;
}

// Calculate the number of lessons in a given month
function calculateLessonCount(month, year, day) {
    return getLessonDates(month, year, day).length;
}

// Calculate the monthly fee
function calculateMonthlyFee(month, year, tuitionFeePerLesson, materialFeePerMonth, day) {
    const lessonCount = calculateLessonCount(month, year, day);
    return (lessonCount * tuitionFeePerLesson) + materialFeePerMonth;
}

// Generate total fee row for selected payment frequency
function generateTotalFeeRow(months, year, tuitionFeePerLesson, materialFeePerMonth, day, paymentFrequency) {
    return months.map((_, index) => {
        if (index % paymentFrequency === 0) {
            const totalFee = months.slice(index, index + paymentFrequency).reduce((acc, month) => acc + calculateMonthlyFee(month, year, tuitionFeePerLesson, materialFeePerMonth, day), 0);
            return `<td class="p-2 border">${totalFee}</td>`;
        } else {
            return `<td class="p-2 border"></td>`;
        }
    }).join('');
}

function downloadAsPDF() {
    const year = parseInt(document.getElementById('year').value, 10);
    const level = document.getElementById('level').value;
    const subject = document.getElementById('subject').value;
    const day = document.getElementById('day').value;
    const teacher = document.getElementById('teacher').value;

    console.log('Download button pressed');
    const element = document.getElementById('outputContainer'); // Target the entire output container
    const filename = `${year}-${level.toUpperCase()}-${subject.toUpperCase()}-${day.toUpperCase()}-${teacher}.pdf`;

    // Hide the download button temporarily if it's within the same container
    const downloadButton = document.getElementById('downloadPdf');
    downloadButton.style.display = 'none';

    // Ensure the outputContainer is visible for PDF export
    element.classList.remove('hidden');

    // Initiate PDF download
    html2pdf()
        .set({
            margin: 0.2,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 0.7 },
            jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' }
        })
        .from(element)
        .save()
        .then(() => {
            // Restore the visibility state of the download button
            downloadButton.style.display = 'block';
            // Do not hide the container here; you may want to keep it visible
            // If you want to hide it, consider adding a button to hide it manually.
        })
        .catch((error) => {
            console.error('PDF generation failed:', error);
            // Ensure the button is visible again in case of error
            downloadButton.style.display = 'block';
        });


}

function downloadAsExcel() {
    // Get the generated table HTML
    const year = parseInt(document.getElementById('year').value, 10);
    const level = document.getElementById('level').value;
    const subject = document.getElementById('subject').value;
    const day = document.getElementById('day').value;
    const teacher = document.getElementById('teacher').value;

    // Create a temporary DOM element to parse the table
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tableHtml;
    const table = tempDiv.querySelector('table');

    // Convert the table into a SheetJS-compatible data structure
    const worksheetData = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td, th').forEach(cell => {
            rowData.push(cell.innerText.trim());
        });
        worksheetData.push(rowData);
    });

    // Create a worksheet from the extracted data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply styles to the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']); // Get the range of the sheet
    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress] || {};
            cell.s = {
                border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                },
                alignment: {
                    vertical: 'center',
                    horizontal: 'center'
                }
            };
            worksheet[cellAddress] = cell; // Update the cell in the worksheet
        }
    }

    // Auto-adjust column widths
    const columnWidths = worksheetData[0].map((col, index) => {
        const maxLength = worksheetData.reduce((max, row) => {
            const cellValue = row[index] || '';
            return Math.max(max, cellValue.length);
        }, 10); // Default minimum width
        return { wch: maxLength + 2 }; // Add padding
    });
    worksheet['!cols'] = columnWidths;

    // Create a workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Table');

    // Define the filename
    const filename = `${year}-${level.toUpperCase()}-${subject.toUpperCase()}-${day.toUpperCase()}-${teacher}.xlsx`;

    // Save the workbook
    XLSX.writeFile(workbook, filename);
    console.log('Excel download completed.');
}