// CAD ו-SOLIDWORKS: content file. Format is documented in CONTENT-GUIDE.md.
const r = String.raw;
const SW = 'SOLIDWORKS Help (Dassault Systèmes)';
const ISO = 'ISO 128 / ISO 5456-2 (שיטות היטל)';
const Y143 = 'ASME Y14.3 (מבטים וחתכים)';
const KA = 'Kalpakjian & Schmid, Manufacturing Engineering and Technology';
const V = (fn, args, caption) => ({ spec: { fn, args }, caption });

export default {
  id: 'cad',
  title: 'CAD ו-SOLIDWORKS',
  en: 'CAD & SOLIDWORKS',
  icon: '🖥️',
  summary: 'סקיצות ו-design intent, עץ פיצ\'רים, הרכבות, שרטוטים, קונפיגורציות ו-PDM',
  subtopics: [
    // ===================================================================
    {
      id: 'cad-sketch', title: 'סקיצות ו-Design Intent', en: 'Sketches & Design Intent',
      lesson: {
        intuition: r`**Design intent** הוא "מה חשוב בחלק": אילו מידות קובעות, מה סימטרי, מה תלוי במה. מודל טוב משתנה נכון כשמשנים מידה אחת: החורים נשארים במרכז, והקיר שומר על עובי. סקיצה **מוגדרת לגמרי** (fully defined, שחורה ב-SOLIDWORKS) לא זזה לבד, וכל קו בה נקבע על ידי מידה או קשר (relation).`,
        equations: [
          { tex: r`\text{DOF}_{sketch}=0\iff\text{fully defined}`, label: 'סקיצה מוגדרת: בלי דרגות חופש פתוחות' },
        ],
        diagram: null,
        example: null,
        implications: [
          r`**קשרים לפני מידות:** אופקי, אנכי, מקביל, משיק, שוויון, סימטריה סביב קו מרכז. הם מבטאים כוונה, והמידות רק קובעות גודל.`,
          r`למדוד ממשטחי ה-datum של החלק (אותם משטחים שבשרטוט), לא ממידה למידה, כדי שהמודל יתאים לשרטוט ולתפקוד.`,
          r`בצבעים של SOLIDWORKS: כחול = לא מוגדר, שחור = מוגדר, אדום/צהוב = מוגדר-יתר (over defined) או בעיה.`,
          r`סקיצות פשוטות עדיפות: הרבה פיצ'רים פשוטים במקום סקיצה ענקית אחת. קל יותר לשנות ולאתר תקלות.`,
        ],
        sources: [SW],
      },
      questions: [
        { id: 'cs1', type: 'mcq', difficulty: 1, q: 'מה המשמעות של סקיצה שחורה (fully defined) ב-SOLIDWORKS?', options: ['היא שגויה', 'כל הגיאומטריה נקבעה במידות וקשרים, ושום דבר לא יכול לזוז לבד', 'היא מוסתרת', 'היא בסנטימטרים'], answer: 1, explain: r`כחול = חופשי, שחור = מוגדר.`, source: SW },
        { id: 'cs2', type: 'mcq', difficulty: 2, q: 'משנים את רוחב הלוח, והחור "בורח" מהמרכז. מה חסר בסקיצה?', options: ['צבע', 'קשר סימטריה או מידה למרכז, שמבטאים את ה-design intent', 'עוד פילט', 'יחידות'], answer: 1, explain: r`החור הוגדר במידה מקצה אחד, לא ממרכז.`, source: SW },
        { id: 'cs3', type: 'tf', difficulty: 1, q: 'סקיצה מוגדרת-יתר (over defined) היא מצב תקין ורצוי.', answer: false, explain: r`יש מידות או קשרים סותרים או כפולים. מוחקים את המיותר.`, source: SW },
      ],
      generators: [],
    },
    // ===================================================================
    {
      id: 'cad-features', title: 'עץ פיצ\'רים והורה-ילד', en: 'Feature Tree',
      lesson: {
        intuition: r`חלק ב-SOLIDWORKS הוא מתכון: רשימה של פעולות (פיצ'רים) לפי סדר. כל פיצ'ר נשען על אלה שלפניו: **הורה וילד**. משנים או מוחקים פיצ'ר למעלה, וכל מה שתלוי בו למטה עלול להישבר. מודל יציב בונה קודם צורה בסיסית, אחר כך פרטים, ורדיוסים ושיפועים בסוף.`,
        equations: [
          { tex: r`\text{Base}\rightarrow\text{Features}\rightarrow\text{Holes}\rightarrow\text{Fillets/Chamfers}`, label: 'סדר מומלץ' },
        ],
        diagram: { fn: 'featureTree', args: [] },
        example: null,
        implications: [
          r`**פילטים בסוף:** פילט מוקדם יוצר קצוות שפיצ'רים מאוחרים מתייחסים אליהם, וכשהוא משתנה הם נשברים.`,
          r`**Hole Wizard** לקדחים: הוא יוצר קדח סטנדרטי (הברגה, קידוח קוני, מעבר) ושומר את המידע לשרטוט.`,
          r`להתייחס למישורי ייחוס (Front/Top/Right) ולפיצ'רים יציבים, לא לקצוות של רדיוסים.`,
          r`שגיאת "rebuild" אדומה: לבדוק את ההורה. לרוב ייחוס שנעלם (קצה או פנים שנמחקו).`,
        ],
        sources: [SW],
      },
      questions: [
        { id: 'cf1', type: 'mcq', difficulty: 1, q: 'למה מוסיפים פילטים בדרך כלל בסוף עץ הפיצ\'רים?', options: ['הם יפים', 'כדי שפיצ\'רים אחרים לא יתייחסו לקצוות שלהם, ושינוי בהם לא ישבור את המודל', 'הם איטיים', 'אין סיבה'], answer: 1, explain: r`מפחיתים תלות הורה-ילד רגישה.`, source: SW },
        { id: 'cf2', type: 'mcq', difficulty: 2, q: 'מוחקים פיצ\'ר, ופתאום שלושה פיצ\'רים אחרים באדום. למה?', options: ['באג', 'הם היו "ילדים" שלו והתייחסו לגיאומטריה שלו', 'החומר השתנה', 'אין קשר'], answer: 1, explain: r`קשרי הורה-ילד.`, source: SW },
        { id: 'cf3', type: 'tf', difficulty: 1, q: 'Hole Wizard שומר את נתוני ההברגה ומאפשר להציג אותם אוטומטית בשרטוט.', answer: true, explain: r`עדיף על חיתוך עגול רגיל.`, source: SW },
      ],
      generators: [],
    },
    // ===================================================================
    {
      id: 'cad-assembly', title: 'הרכבות ו-Mates', en: 'Assemblies & Mates',
      lesson: {
        intuition: r`לכל חלק חופשי בהרכבה יש **6 דרגות חופש**: 3 תזוזות ו-3 סיבובים. כל mate נועל חלק מהן. **Concentric** בין פין לחור נועל 4 (משאיר החלקה וסיבוב), **Coincident** בין שני משטחים נועל 3. מגדירים רק מה שהמנגנון באמת מגביל, כדי שחלקים נעים יזוזו כמו במציאות.`,
        equations: [
          { tex: r`\text{DOF}=6-\sum\text{(independent constraints)}`, label: 'דרגות חופש שנשארות' },
          { tex: r`\text{Concentric}:-4,\quad\text{Coincident (planes)}:-3`, label: 'mates נפוצים' },
        ],
        diagram: { fn: 'dofCube', args: [] },
        example: {
          q: r`פין בחור: Concentric, ואז Coincident בין ראש הפין לפני החלק. כמה דרגות חופש נשארות?`,
          steps: [r`6-4=2\ \text{(slide, spin)}`, r`\text{Coincident removes the slide}\Rightarrow1\ \text{(spin)}`],
        },
        implications: [
          r`החלק הראשון בהרכבה **קבוע** (fixed). בונים מסביבו.`,
          r`**Interference Detection** בודק חפיפות בין חלקים. **Collision Detection** בודק בתנועה.`,
          r`mates מיותרים או סותרים (over-defined) מאטים ויוצרים שגיאות. משאירים חופש איפה שיש תנועה.`,
          r`**תת-הרכבות** (sub-assemblies) לפי מבנה הייצור: אותן יחידות שמרכיבים בנפרד בקו. זה גם מסדר את ה-BOM.`,
        ],
        sources: [SW],
      },
      questions: [
        { id: 'ca1', type: 'mcq', difficulty: 1, q: 'כמה דרגות חופש יש לחלק חופשי בהרכבה?', options: ['3', '4', '6', '12'], answer: 2, explain: r`3 תזוזות ו-3 סיבובים.`, source: SW },
        { id: 'ca2', type: 'mcq', difficulty: 2, q: 'איזה כלי מוצא חלקים שחודרים זה לזה בהרכבה סטטית?', options: ['Mass Properties', 'Interference Detection', 'Design Table', 'Hole Wizard'], answer: 1, explain: r`חובה לפני שחרור לייצור.`, source: SW },
        { id: 'ca3', type: 'tf', difficulty: 2, q: 'כדאי לנעול את כל החלקים בהרכבה ב-Fix, כדי שלא יזוזו.', answer: false, explain: r`אז אי אפשר לבדוק תנועה, ושינויים לא מתעדכנים נכון. משתמשים ב-mates שמבטאים את התפקוד.`, source: SW },
      ],
      generators: ['gcd-dof'],
    },
    // ===================================================================
    {
      id: 'cad-drawings', title: 'שרטוטים: מבטים, חתכים ושיטות היטל', en: 'Engineering Drawings',
      lesson: {
        intuition: r`השרטוט הוא החוזה עם היצרן: מה שלא כתוב בו, לא מחייב. הוא מציג את החלק במבטים, בחתכים (לחשוף פנים), ובפרטים מוגדלים, עם כל המידות, הטולרנסים, החומר, הגימור וההערות. **שיטת ההיטל** קובעת איפה כל מבט מופיע, ולכן הסמל שלה בכותרת קריטי.`,
        equations: [
          { tex: r`\text{ISO: 1st}\quad\text{ASME: 3rd}`, label: 'שתי שיטות היטל: זווית ראשונה ושלישית' },
        ],
        diagram: { fn: 'projectionSymbols', args: [] },
        example: null,
        implications: [
          r`**זווית ראשונה:** המבט משמאל מצויר **מימין** למבט החזיתי. **זווית שלישית:** המבט משמאל מצויר **משמאל**. טעות בזה הופכת את החלק.`,
          r`באירופה נפוצה זווית ראשונה ובארה"ב שלישית. בישראל יש שימוש בשתיהן, תלוי בחברה ובלקוח.`,
          r`**כותרת (title block):** מספר חלק, גרסה, חומר, ציפוי/טיפול, טולרנסים כלליים, שיטת היטל, תקן, קנה מידה ואישורים.`,
          r`לא מוסיפים כל מידה אפשרית: רק את מה שנדרש לייצור ולבדיקה, פעם אחת, ממשטחי ה-datum. מידות כפולות יוצרות סתירות.`,
        ],
        sources: [ISO, Y143, SW],
      },
      questions: [
        { id: 'cd1', type: 'mcq', difficulty: 1, q: 'למה חשוב לבדוק את סמל שיטת ההיטל בכותרת?', options: ['בשביל העיצוב', 'כי הוא קובע איפה כל מבט מוצג, וקריאה שגויה הופכת את החלק', 'כי הוא קובע את החומר', 'הוא לא חשוב'], answer: 1, explain: r`זווית ראשונה ושלישית מציבות את המבטים הפוך.`, source: ISO },
        { id: 'cd2', type: 'mcq', difficulty: 2, q: 'בזווית ראשונה (ISO), איפה מצויר המבט מצד שמאל?', options: ['משמאל למבט החזיתי', 'מימין למבט החזיתי', 'מעליו', 'מתחתיו'], answer: 1, explain: r`בזווית שלישית (ASME) הוא משמאל.`, source: ISO },
        { id: 'cd3', type: 'tf', difficulty: 1, q: 'כדאי לתת כל מידה בשרטוט פעמיים (במבטים שונים), ליתר ביטחון.', answer: false, explain: r`מידה כפולה יכולה להיות סותרת אחרי שינוי. כל מידה פעם אחת.`, source: Y143 },
      ],
      generators: [],
    },
    // ===================================================================
    {
      id: 'cad-config', title: 'קונפיגורציות, Design Tables ומשוואות', en: 'Configurations & Design Tables',
      lesson: {
        intuition: r`במקום לשרטט 10 ברגים שונים, משרטטים אחד ונותנים לו 10 **קונפיגורציות**: אותו מודל, מידות שונות. **Design Table** היא טבלת Excel שבה כל שורה היא קונפיגורציה וכל עמודה מידה. **משוואות** קושרות מידות זו לזו (למשל עובי = קוטר/10), כך שהמודל שומר על היחסים.`,
        equations: [
          { tex: r`\text{"Wall"}=\text{"D"}/10`, label: 'דוגמה למשוואה בין מידות' },
        ],
        diagram: null,
        example: null,
        implications: [
          r`מצוין למשפחות של חלקים: אורכים שונים של פרופיל, גדלים של תושבת, גרסאות של מוצר.`,
          r`כל קונפיגורציה יכולה לקבל מספר חלק משלה, וזה מה שמופיע ב-BOM.`,
          r`**גלובל וריאבלס** במשוואות מאפשרים לשנות מוצר שלם ממקום אחד.`,
          r`יותר מדי קונפיגורציות בקובץ אחד מאט ומסבך. לפעמים עדיף קבצים נפרדים.`,
        ],
        sources: [SW],
      },
      questions: [
        { id: 'cc1', type: 'mcq', difficulty: 1, q: 'מה הדרך היעילה לנהל 15 גדלים של אותה תושבת?', options: ['15 קבצים נפרדים', 'קונפיגורציות עם Design Table', 'לשרטט כל פעם מחדש', 'קובץ PDF'], answer: 1, explain: r`מודל אחד, טבלה של מידות.`, source: SW },
        { id: 'cc2', type: 'tf', difficulty: 2, q: 'משוואה ב-SOLIDWORKS יכולה לקשור מידה אחת לאחרת, כך שהיחס נשמר כשמשנים.', answer: true, explain: r`למשל עובי דופן כחלק מקוטר.`, source: SW },
      ],
      generators: [],
    },
    // ===================================================================
    {
      id: 'cad-sheet', title: 'Sheet Metal ו-Weldments', en: 'Sheet Metal & Weldments',
      lesson: {
        intuition: r`בסביבת **Sheet Metal** מתכננים חלק פח כמו שמייצרים אותו: עובי קבוע, כיפופים עם רדיוס ו-K-factor, ו-**Flat Pattern** שנותן את הפריסה לחיתוך בלייזר. **Weldments** בונים שלדה מפרופילים סטנדרטיים לאורך קווי סקיצה, ומקבלים אוטומטית **Cut List** עם אורכים וזוויות חיתוך.`,
        equations: [
          { tex: r`BA=\theta\,(R+K\,T)`, label: 'Bend Allowance (כמו בייצור)' },
        ],
        diagram: { fn: 'sheetBend', args: [] },
        example: null,
        implications: [
          r`להתאים את K-factor או את טבלת הכיפוף (bend table) **לספק** ולמכונה שלו. אחרת הפריסה לא תתאים במידות.`,
          r`Relief בפינות, ומרחק מספק של חורים מקווי כיפוף, כבר במודל.`,
          r`Weldments: לבחור פרופיל מתוך ספרייה סטנדרטית, להגדיר trim/extend בחיבורים, ולהוסיף כיסויים (end caps) ופלטות.`,
          r`ה-Cut List מתעדכן אוטומטית ומשמש לרכש ולחיתוך.`,
        ],
        sources: [SW, KA],
      },
      questions: [
        { id: 'csh1', type: 'mcq', difficulty: 1, q: 'מה נותן ה-Flat Pattern ב-Sheet Metal?', options: ['את המשקל', 'את הפריסה השטוחה של החלק לחיתוך', 'את המאמצים', 'את הצבע'], answer: 1, explain: r`מחושב לפי ה-K-factor וטבלת הכיפוף.`, source: SW },
        { id: 'csh2', type: 'mcq', difficulty: 2, q: 'החלק המכופף מהספק יצא ארוך ב-1 mm מהמודל. מה לבדוק קודם?', options: ['את הצבע', 'את ה-K-factor או טבלת הכיפוף מול הכלים של הספק', 'את המסה', 'את הגרסה של התוכנה'], answer: 1, explain: r`הם קובעים את הפריסה.`, source: KA },
        { id: 'csh3', type: 'tf', difficulty: 1, q: 'Weldments מייצר אוטומטית Cut List של הפרופילים, עם אורכים.', answer: true, explain: r`שימושי לרכש ולחיתוך.`, source: SW },
      ],
      generators: [],
    },
    // ===================================================================
    {
      id: 'cad-mass', title: 'Mass Properties ומרכז מסה', en: 'Mass Properties',
      lesson: {
        intuition: r`CAD יודע לחשב נפח, מסה, מרכז מסה ומומנטי אינרציה, **אם** הגדרתם חומר. זה חשוב לתכן תושבות, לחישוב אינרציה למנועים, ליציבות של מכשיר שעומד על שולחן, ולמשקל של מוצר נייד.`,
        equations: [
          { tex: r`m=\rho V`, label: 'מסה' },
          { tex: r`\bar x=\frac{\sum m_ix_i}{\sum m_i}`, label: 'מרכז מסה של כמה חלקים' },
        ],
        diagram: null,
        example: {
          q: r`נפח 85 cm³ מאלומיניום (2.70 g/cm³). ושלושה חלקים: 2 kg ב-0, 1 kg ב-150 mm, 0.5 kg ב-300 mm.`,
          steps: [r`m=2.70\cdot85=229.5\ \text{g}`, r`\bar x=\frac{0+150+150}{3.5}=85.7\ \text{mm}`],
        },
        implications: [
          r`בלי חומר מוגדר, SOLIDWORKS משתמש בצפיפות ברירת מחדל של 1 g/cm³ (כמו מים). מסה "קלה מדי" היא סימן לזה.`,
          r`מסה מ-CAD לא כוללת ברגים קטנים, דבק, כבלים וצבע אם הם לא ממודלים. מוסיפים מרווח.`,
          r`מומנט האינרציה מה-CAD הוא מה שמזינים לבחירת מנוע או סרוו.`,
        ],
        sources: [SW],
      },
      questions: [
        { id: 'cm1', type: 'mcq', difficulty: 1, q: 'המסה ב-Mass Properties נראית נמוכה בצורה חשודה. מה החשוד?', options: ['באג', 'לא הוגדר חומר, ונעשה שימוש בצפיפות ברירת מחדל', 'יחידות זמן', 'הרכבה פתוחה'], answer: 1, explain: r`ברירת המחדל היא 1 g/cm³.`, source: SW },
        { id: 'cm2', type: 'tf', difficulty: 2, q: 'מרכז מסה גבוה ורחוק מבסיס התמיכה מגדיל את הסיכוי שמכשיר יתהפך.', answer: true, explain: r`מומנט ההתהפכות גדל, והזווית שבה הוא מתהפך קטנה.`, source: SW },
      ],
      generators: ['gcd-mass', 'gcd-com'],
    },
    // ===================================================================
    {
      id: 'cad-pdm', title: 'BOM, גרסאות ו-PDM', en: 'BOM, Revisions & PDM',
      lesson: {
        intuition: r`בצוות, הבעיה הגדולה היא לא לשרטט, אלא לדעת **איזו גרסה נכונה**. **PDM** (Product Data Management) מנהל את הקבצים: check-in/check-out כדי ששניים לא יעבדו על אותו קובץ, היסטוריית גרסאות, ותהליכי אישור. **BOM** נגזר מההרכבה ומגדיר מה קונים ומה מייצרים. **ECO** מנהל כל שינוי אחרי שחרור.`,
        equations: [
          { tex: r`\text{Rev A}\rightarrow\text{ECO}\rightarrow\text{Rev B}`, label: 'כל שינוי משוחרר מעלה גרסה' },
        ],
        diagram: { fn: 'npiFlow', args: [] },
        example: null,
        implications: [
          r`**מספר חלק** מזהה את החלק, **גרסה** את המצב שלו. שינוי שמשפיע על החלפתיות (interchangeability) מחייב מספר חלק חדש, לא רק גרסה.`,
          r`BOM **הנדסי** (לפי ההרכבה) ו-BOM **ייצורי** (לפי שלבי הייצור) יכולים להיות שונים.`,
          r`לשמור קבצים רק ב-PDM, לא בדסקטופ. "הגרסה האחרונה במייל" היא מקור לטעויות יקרות.`,
          r`חיבור ל-ERP: ה-BOM המשוחרר הוא מה שהרכש והייצור עובדים לפיו.`,
        ],
        sources: [SW, KA],
      },
      questions: [
        { id: 'cp1', type: 'mcq', difficulty: 1, q: 'מה check-out ב-PDM מונע?', options: ['שמירה', 'ששני מהנדסים ישנו את אותו קובץ במקביל וידרסו זה את זה', 'הדפסה', 'פתיחה בקריאה בלבד'], answer: 1, explain: r`רק מי שמחזיק את הקובץ יכול לשנות.`, source: SW },
        { id: 'cp2', type: 'mcq', difficulty: 2, q: 'משנים קוטר קדח כך שהחלק החדש כבר לא מתאים להרכבות הישנות. מה עושים?', options: ['רק מעלים גרסה', 'מספר חלק חדש, כי ההחלפתיות נפגעה', 'לא משנים כלום', 'מוחקים את הישן'], answer: 1, explain: r`גרסה חדשה רק כשהחלק עדיין מחליף את הקודם.`, source: KA },
        { id: 'cp3', type: 'tf', difficulty: 1, q: 'BOM נגזר מההרכבה ב-CAD ומשמש את הרכש ואת הייצור.', answer: true, explain: r`לכן חשוב שההרכבה תשקף את המבנה האמיתי.`, source: SW },
      ],
      generators: [],
    },
  ],
};
