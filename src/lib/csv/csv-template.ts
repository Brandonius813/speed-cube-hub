const TEMPLATE_CONTENT = `date,event,practice_type,num_solves,duration_minutes,avg_time,notes
2024-01-15,3x3,Solves,100,60,12.34,Good session focused on cross solutions
2024-01-16,2x2,Drill Algs,50,30,,Working on CLL algorithms`;

/**
 * Triggers a CSV template file download in the browser.
 */
export function downloadCsvTemplate() {
  const blob = new Blob([TEMPLATE_CONTENT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "speed-cube-hub-import-template.csv";
  link.click();

  URL.revokeObjectURL(url);
}
