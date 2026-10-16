/* Shared immutable choices only. Prompt and Editor keep their own selection state. */
(() => {
  'use strict';
  const subjects=Object.freeze(['สังคมศึกษา','ภาษาไทย','คณิตศาสตร์','วิทยาศาสตร์','ภาษาอังกฤษ','สุขศึกษา','ศิลปะ','การงานอาชีพ','วิทยาการคำนวณ','อื่น ๆ']);
  const gradeGroups=Object.freeze({
    'อนุบาล':Object.freeze(['อ.1','อ.2','อ.3']),
    'ประถมศึกษา':Object.freeze(Array.from({length:6},(_,i)=>'ป.'+(i+1))),
    'มัธยมศึกษา':Object.freeze(Array.from({length:6},(_,i)=>'ม.'+(i+1)))
  });
  const normalizeGrade=value=>String(value||'').trim().replace(/^อนุบาล\s*/,'อ.').replace(/^ประถมศึกษาปีที่\s*/,'ป.').replace(/^มัธยมศึกษาปีที่\s*/,'ม.');
  window.LearningOptions=Object.freeze({subjects,gradeGroups,normalizeGrade});
})();
