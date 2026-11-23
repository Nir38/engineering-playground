// חוזק חומרים: content file. Format is documented in CONTENT-GUIDE.md.
// Text uses r`...` (String.raw) so LaTeX backslashes stay as written.
const r = String.raw;
const H = 'Hibbeler, Mechanics of Materials';
const S = "Shigley's Mechanical Engineering Design";
const G = 'סיכום גרפים ומחזורים בהנדסת מכונות (חומר גלם)';
const Q = 'סיכום שאלות ראיון בהנדסת מכונות (חומר גלם)';

export default {
  id: 'strength',
  title: 'חוזק חומרים',
  en: 'Strength of Materials',
  icon: '🏗️',
  summary: 'מאמצים, עיבורים, קורות, צירים, קריסה ועייפות',
  subtopics: [
    // ===================================================================
    {
      id: 'stress-strain', title: 'מאמץ, עיבור וחוק הוק', en: 'Stress, Strain, Hooke',
      lesson: {
        intuition: r`**מאמץ** הוא כמה כוח נושא כל מילימטר רבוע של חומר. **עיבור** הוא כמה החומר נמתח ביחס לאורך שלו. שניהם לא תלויים בגודל החלק, ולכן דגם קטן במעבדה מייצג חלק גדול באמת. בתחום האלסטי החומר מתנהג כמו קפיץ: מאמץ כפול נותן עיבור כפול, וכשמשחררים הוא חוזר לגמרי.`,
        equations: [
          { tex: r`\sigma=\frac{F}{A}`, label: 'מאמץ נורמלי' },
          { tex: r`\tau_{avg}=\frac{V}{A}`, label: 'מאמץ גזירה ממוצע' },
          { tex: r`\varepsilon=\frac{\Delta L}{L_0}`, label: 'עיבור' },
          { tex: r`\sigma=E\,\varepsilon`, label: 'חוק הוק' },
          { tex: r`\nu=-\frac{\varepsilon_{lat}}{\varepsilon_{long}}`, label: 'יחס פואסון' },
          { tex: r`G=\frac{E}{2(1+\nu)}`, label: 'מודול גזירה' },
        ],
        diagram: { fn: 'axialBar', args: [{}] },
        example: {
          q: r`מוט פלדה בקוטר 20 mm נמתח בכוח 31.4 kN. מה המאמץ והעיבור? ($E=200$ GPa)`,
          steps: [r`A=\frac{\pi\cdot 20^2}{4}=314.2\ \text{mm}^2`, r`\sigma=\frac{31400}{314.2}\approx 100\ \text{MPa}`, r`\varepsilon=\frac{100}{200000}=5\times10^{-4}`],
        },
        implications: [
          r`$E$ של כמעט כל הפלדות הוא בערך 200 GPa, וזה לא משתנה בטיפול תרמי. טיפול תרמי מעלה **חוזק**, לא **קשיחות**.`,
          r`אלומיניום ($E\approx70$ GPa) גמיש בערך פי 3 מפלדה. אם חלק גמיש מדי, משנים גיאומטריה ולא סגסוגת.`,
          r`עבודה ב-N, mm ו-MPa חוסכת המרות: $1\ \text{MPa}=1\ \text{N/mm}^2$.`,
          r`עיבור אלסטי במתכת הוא בסדר גודל של $10^{-4}$ עד $10^{-3}$. מספר גדול יותר מרמז על טעות ביחידות.`,
        ],
        sources: [`${H}, פרקים 1-3`, 'המוח: [[חוזק חומרים]], שיעור 1'],
      },
      questions: [
        { id: 'ss1', type: 'mcq', difficulty: 1, q: r`למה שווה $1\ \text{MPa}$?`, options: [r`$1\ \text{N/mm}^2$`, r`$1\ \text{N/m}^2$`, r`$1\ \text{kN/mm}^2$`, r`$1\ \text{N/cm}^2$`], answer: 0, explain: r`$1\ \text{MPa}=10^6\ \text{N/m}^2=10^6\ \text{N}/10^6\ \text{mm}^2=1\ \text{N/mm}^2$.`, source: `${H}, פרק 1` },
        { id: 'ss2', type: 'mcq', difficulty: 1, q: r`מה בערך מודול יאנג של פלדה?`, options: ['70 GPa', '110 GPa', '200 GPa', '400 GPa'], answer: 2, explain: r`פלדות הן בסביבות 200 GPa. 70 GPa זה אלומיניום, ובסביבות 110 GPa טיטניום.`, source: `${H}, נספח תכונות חומרים` },
        { id: 'ss3', type: 'tf', difficulty: 1, q: r`הקשיה (טיפול תרמי) של פלדה מגדילה משמעותית את מודול יאנג שלה.`, answer: false, explain: r`טיפול תרמי משנה את $S_y$ ואת $S_{ut}$, אבל $E$ נקבע מכוחות הקשר בין האטומים וכמעט לא משתנה. חלק מוקשה **חזק** יותר, לא **קשיח** יותר.`, source: `${S}, פרק 2` },
        { id: 'ss4', type: 'mcq', difficulty: 1, q: r`מה ערך טיפוסי של יחס פואסון $\nu$ במתכות?`, options: ['0.1', '0.3', '0.5', '0.8'], answer: 1, explain: r`במתכות בערך 0.3. הערך 0.5 שייך לחומר שלא משנה נפח, כמו גומי. הגבול התאורטי לחומר איזוטרופי הוא 0.5.`, source: `${H}, פרק 3` },
        { id: 'ss5', type: 'mcq', difficulty: 2, q: r`שני מוטות מאותו חומר ובאותו עומס. הקוטר של מוט B כפול מזה של מוט A. מה היחס $\sigma_B/\sigma_A$?`, options: ['1/2', '1/4', '2', '1/8'], answer: 1, explain: r`$A\propto d^2$, ולכן קוטר כפול נותן שטח פי 4 ומאמץ קטן פי 4.`, source: `${H}, פרק 1` },
        { id: 'ss6', type: 'open', difficulty: 2, q: r`שאלת ראיון: מה ההבדל בין stiffness, strength ו-hardness?`, model: r`**Strength (חוזק):** המאמץ שהחומר עומד בו לפני כניעה או שבר ($S_y$, $S_{ut}$). **Stiffness (קשיחות):** התנגדות לעיוות אלסטי, נקבעת על ידי $E$ ועל ידי הגיאומטריה. **Hardness (קשיות):** התנגדות של פני השטח לחדירה או לשריטה (Rockwell, Vickers, Brinell). דוגמה: פלדה מוקשה ופלדה רכה שונות מאוד בחוזק ובקשיות, אבל כמעט זהות בקשיחות.`, source: Q },
      ],
      generators: ['g-axial-stress', 'g-hooke-strain', 'g-poisson'],
    },
    // ===================================================================
    {
      id: 'curve', title: 'עקומת מאמץ-עיבור', en: 'Stress-Strain Curve',
      lesson: {
        intuition: r`מותחים דגם עד שבר ומשרטטים מאמץ מול עיבור. בהתחלה יש קו ישר (אלסטי). אחר כך שכבות אטומים מתחילות להחליק דרך נקעים (dislocations), וזו **כניעה**. הנקעים מסתבכים והחומר מתחזק (**strain hardening**) עד המאמץ המקסימלי, **UTS**. משם החתך מתחיל להצטוור (**necking**), והדגם נשבר.`,
        equations: [
          { tex: r`\sigma=E(\varepsilon-0.002)`, label: 'קו offset של 0.2% לקביעת Sy' },
          { tex: r`U_r=\frac{S_y^2}{2E}`, label: 'מודול חוסן (resilience)' },
          { tex: r`\sigma_T=\sigma(1+\varepsilon)`, label: 'מאמץ אמיתי (עד necking)' },
          { tex: r`\varepsilon_T=\ln(1+\varepsilon)`, label: 'עיבור אמיתי' },
          { tex: r`\%EL=\frac{L_f-L_0}{L_0}\cdot100`, label: 'משיכות (ductility)' },
        ],
        diagram: { fn: 'stressStrain', args: [{ offset: true }] },
        example: {
          q: r`פלדה עם $S_y=250$ MPa ו-$E=200$ GPa. מה מודול החוסן?`,
          steps: [r`U_r=\frac{(250\times10^6)^2}{2\cdot200\times10^9}=156{,}250\ \text{J/m}^3\approx156\ \text{kJ/m}^3`],
        },
        implications: [
          r`חלק רקיע (ductile) מתכננים לפי $S_y$. חלק שביר (ברזל יצוק, קרמיקה) מתכננים לפי $S_{ut}$.`,
          r`באלומיניום אין רמת כניעה ברורה, ולכן $S_y$ נקבע בשיטת offset של 0.2%.`,
          r`בשחרור מעבר לכניעה העקומה יורדת בקו מקביל ל-$E$, ונשאר עיבור קבוע. העמסה חוזרת: $S_y$ החדש שווה למאמץ המקסימלי שהחלק ראה. זה הבסיס לחיזוק בעיבוד קר.`,
          r`Springback בכיפוף פח גדל עם $S_y/E$, ולכן באלומיניום הוא גדול יותר.`,
        ],
        sources: [`${H}, פרק 3`, `${G}, עמ' 10`, 'המוח: [[חוזק חומרים]], שיעור 2'],
      },
      questions: [
        { id: 'cv1', type: 'mcq', difficulty: 1, q: 'באיזו נקודה בעקומה מתחיל ה-necking?', options: ['בגבול הפרופורציה', 'בכניעה', 'במאמץ המקסימלי (UTS)', 'בשבר'], answer: 2, explain: r`ב-UTS הקטנת החתך מתחילה "לנצח" את ההתקשות, והעיוות מתרכז באזור אחד.`, source: `${H}, פרק 3` },
        { id: 'cv2', type: 'mcq', difficulty: 1, q: r`איך קובעים את $S_y$ לחומר בלי רמת כניעה ברורה, כמו אלומיניום?`, options: ['לפי UTS חלקי 2', 'שיטת offset של 0.2%', 'לפי נקודת השבר', 'לפי קשיות'], answer: 1, explain: r`משרטטים קו בשיפוע $E$ שמוזז ב-0.002 בציר העיבור. נקודת החיתוך עם העקומה היא $S_y$.`, source: `${G}, עמ' 10` },
        { id: 'cv3', type: 'tf', difficulty: 2, q: 'כשמשחררים עומס מנקודה בתחום הפלסטי, קו השחרור מקביל לקו האלסטי ההתחלתי.', answer: true, explain: r`השחרור אלסטי, ולכן בשיפוע $E$. העיבור שנשאר הוא $\varepsilon_{pl}=\varepsilon-\sigma/E$.`, source: `${H}, פרק 3` },
        { id: 'cv4', type: 'tf', difficulty: 2, q: 'המאמץ ההנדסי יורד אחרי UTS כי החומר באמת נחלש.', answer: false, explain: r`המאמץ ההנדסי מחושב לפי השטח **ההתחלתי**. השטח האמיתי קטן ב-necking, והמאמץ האמיתי ממשיך לעלות עד השבר.`, source: `${G}, עמ' 10` },
        { id: 'cv5', type: 'mcq', difficulty: 1, q: 'מה מייצג השטח הכולל מתחת לעקומת מאמץ-עיבור?', options: ['קשיחות (E)', 'Toughness: האנרגיה שהחומר סופג עד שבר', 'קשיות', 'גבול עייפות'], answer: 1, explain: r`השטח עד הכניעה הוא resilience. השטח עד השבר הוא toughness.`, source: Q },
        { id: 'cv6', type: 'mcq', difficulty: 2, q: 'חלק נמתח מעבר לכניעה, שוחרר והועמס שוב. מה נכון?', options: ['Sy החדש נמוך יותר', 'Sy החדש שווה למאמץ המקסימלי שהגיע אליו, ה-UTS לא השתנה, והמשיכות שנותרה קטנה', 'גם UTS עלה', 'E עלה'], answer: 1, explain: r`זה strain hardening: מרוויחים כניעה גבוהה יותר ומשלמים במשיכות. כך עובד חיזוק בעיבוד קר.`, source: 'המוח: [[חוזק חומרים]], שיעור 2' },
      ],
      generators: ['g-resilience', 'g-permanent', 'g-true-stress'],
    },
    // ===================================================================
    {
      id: 'axial', title: 'עומס צירי, התארכות ומאמץ תרמי', en: 'Axial Load & Thermal Stress',
      lesson: {
        intuition: r`מוט במתיחה הוא קפיץ עם קבוע $k=AE/L$. מוט קצר ועבה קשיח, ומוט ארוך ודק רך. חימום גורם להתארכות. אם מישהו מונע אותה (קירות, ברגים), נוצר מאמץ גם בלי שום כוח חיצוני.`,
        equations: [
          { tex: r`\Delta L=\frac{FL}{AE}`, label: 'התארכות' },
          { tex: r`k=\frac{AE}{L}`, label: 'קשיחות צירית' },
          { tex: r`\Delta L=\sum_i\frac{F_iL_i}{A_iE_i}`, label: 'מוט מכמה מקטעים' },
          { tex: r`\delta_T=\alpha\,\Delta T\,L`, label: 'התארכות תרמית' },
          { tex: r`\sigma=E\,\alpha\,\Delta T`, label: 'מאמץ במוט מרוסן לגמרי' },
        ],
        diagram: { fn: 'axialBar', args: [{}] },
        example: {
          q: r`מוט פלדה בקוטר 20 mm ובאורך 1 m נמתח ב-20 kN. מה ההתארכות?`,
          steps: [r`A=314.2\ \text{mm}^2`, r`\Delta L=\frac{20000\cdot1000}{314.2\cdot200000}=0.318\ \text{mm}`],
        },
        implications: [
          r`כדי להקטין התארכות: לקצר את $L$ או להגדיל את $A$. החלפה לפלדה חזקה יותר לא עוזרת, כי $E$ זהה.`,
          r`מאמץ תרמי במוט מרוסן לא תלוי באורך ולא בחתך. זו הסיבה לתפרי התפשטות בגשרים ובצנרת.`,
          r`בעיה סטטית לא מסוימת (statically indeterminate) נפתרת בעזרת משוואת התאמה (compatibility) של העיוותים, בנוסף לשיווי משקל.`,
        ],
        sources: [`${H}, פרק 4`],
      },
      questions: [
        { id: 'ax1', type: 'mcq', difficulty: 1, q: 'איך מקטינים פי 2 את ההתארכות של מוט, בלי להחליף חומר ובלי לשנות את העומס?', options: ['להכפיל את האורך', 'להכפיל את שטח החתך', 'להכפיל את הקוטר פי 2', 'להחליף לפלדה מוקשה'], answer: 1, explain: r`$\Delta L\propto 1/A$. הכפלת הקוטר מגדילה את השטח פי 4, ולכן מקטינה פי 4 ולא פי 2.`, source: `${H}, פרק 4` },
        { id: 'ax2', type: 'mcq', difficulty: 1, q: 'מוט אלומיניום ומוט פלדה זהים בגיאומטריה ובעומס. מה היחס בין ההתארכויות?', options: ['שווה', 'האלומיניום מתארך בערך פי 3', 'הפלדה מתארכת בערך פי 3', 'האלומיניום מתארך בערך פי 10'], answer: 1, explain: r`$E_{steel}/E_{Al}\approx200/70\approx2.9$.`, source: `${H}, פרק 4` },
        { id: 'ax3', type: 'tf', difficulty: 2, q: 'במוט מרוסן לגמרי בין שני קירות, המאמץ התרמי גדל עם אורך המוט.', answer: false, explain: r`$\sigma=E\alpha\Delta T$. אין תלות באורך ולא בחתך.`, source: `${H}, פרק 4` },
        { id: 'ax4', type: 'mcq', difficulty: 2, q: r`שני מוטות מחוברים בטור (אחד אחרי השני) עם קשיחויות $k_1$ ו-$k_2$. מה הקשיחות הכוללת?`, options: [r`$k_1+k_2$`, r`$\frac{k_1k_2}{k_1+k_2}$`, r`$\sqrt{k_1k_2}$`, r`$\max(k_1,k_2)$`], answer: 1, explain: r`בטור הכוח זהה והעיוותים מתחברים: $\frac{1}{k}=\frac{1}{k_1}+\frac{1}{k_2}$. במקביל הקשיחויות מתחברות.`, source: `${H}, פרק 4` },
        { id: 'ax5', type: 'mcq', difficulty: 2, q: 'מה צריך כדי לפתור בעיה סטטית לא מסוימת?', options: ['עוד משוואת שיווי משקל', 'משוואת התאמה (compatibility) של העיוותים', 'להזניח את אחת התמיכות', 'מקדם ביטחון'], answer: 1, explain: r`משוואות שיווי המשקל לא מספיקות, ולכן מוסיפים תנאי גיאומטרי על העיוותים, למשל שסכום ההתארכויות שווה לאפס.`, source: `${H}, פרק 4` },
      ],
      generators: ['g-elongation', 'g-thermal-stress'],
    },
    // ===================================================================
    {
      id: 'torsion', title: 'פיתול בצירים', en: 'Torsion',
      lesson: {
        intuition: r`ציר שמעביר מומנט מתפתל. מאמץ הגזירה גדל ליניארית מאפס במרכז עד מקסימום בפני השטח. לכן החומר שבמרכז כמעט לא עובד, וציר חלול חסכוני במשקל.`,
        equations: [
          { tex: r`\tau=\frac{T\,r}{J}`, label: 'מאמץ גזירה' },
          { tex: r`J=\frac{\pi d^4}{32}`, label: 'ציר מלא' },
          { tex: r`J=\frac{\pi(d_o^4-d_i^4)}{32}`, label: 'ציר חלול' },
          { tex: r`\tau_{max}=\frac{16T}{\pi d^3}`, label: 'ציר מלא, בפני השטח' },
          { tex: r`\varphi=\frac{TL}{GJ}`, label: 'זווית פיתול [rad]' },
          { tex: r`P=T\omega,\quad \omega=\frac{2\pi n}{60}`, label: 'הספק ומהירות [rpm]' },
        ],
        diagram: { fn: 'shaft', args: [{}] },
        example: {
          q: r`מנוע 10 kW ב-1450 rpm מניע ציר מלא בקוטר 25 mm. מה $\tau_{max}$?`,
          steps: [r`\omega=\frac{2\pi\cdot1450}{60}=151.8\ \text{rad/s}`, r`T=\frac{10000}{151.8}=65.9\ \text{N}\cdot\text{m}`, r`\tau_{max}=\frac{16\cdot65900}{\pi\cdot25^3}=21.5\ \text{MPa}`],
        },
        implications: [
          r`קוטר כפול מקטין את המאמץ פי 8 ($d^3$) ואת זווית הפיתול פי 16 ($d^4$).`,
          r`אותו הספק במהירות גבוהה יותר דורש מומנט קטן יותר, ולכן ציר דק יותר. זה ההיגיון של מנועים מהירים עם תמסורת.`,
          r`חתכים פתוחים (I, U, זווית) חלשים מאוד בפיתול. לפיתול עדיף חתך סגור: צינור או קופסה.`,
          r`חומר שביר (גיר, ברזל יצוק) נשבר בפיתול בסליל של 45°, כי שם מאמץ המתיחה מקסימלי. חומר רקיע נשבר במישור ניצב לציר, שם הגזירה מקסימלית.`,
        ],
        sources: [`${H}, פרק 5`, `${G}, עמ' 12`],
      },
      questions: [
        { id: 'to1', type: 'mcq', difficulty: 1, q: 'איך מתפלג מאמץ הגזירה בחתך של ציר עגול מלא בפיתול?', options: ['אחיד', 'אפס במרכז ועולה ליניארית עד מקסימום בפני השטח', 'מקסימום במרכז', 'פרבולי עם מקסימום באמצע הרדיוס'], answer: 1, explain: r`$\tau=Tr/J$, ליניארי ב-$r$.`, source: `${H}, פרק 5` },
        { id: 'to2', type: 'mcq', difficulty: 1, q: 'מכפילים את קוטר הציר. פי כמה קטן מאמץ הגזירה המקסימלי?', options: ['2', '4', '8', '16'], answer: 2, explain: r`$\tau_{max}=16T/\pi d^3$, ולכן $2^3=8$. זווית הפיתול קטנה פי 16.`, source: `${H}, פרק 5` },
        { id: 'to3', type: 'tf', difficulty: 1, q: 'קורת I היא בחירה טובה לחלק שעובד בעיקר בפיתול.', answer: false, explain: r`חתך פתוח חלש מאוד בפיתול. לפיתול בוחרים צינור או חתך סגור.`, source: Q },
        { id: 'to4', type: 'mcq', difficulty: 2, q: 'למה ציר חלול יעיל יותר במשקל מציר מלא?', options: ['כי J לא תלוי בקוטר', 'כי החומר שבמרכז נושא מאמץ קטן ותורם מעט ל-J', 'כי G של צינור גבוה יותר', 'כי אין בו ריכוזי מאמצים'], answer: 1, explain: r`$J$ תלוי ב-$r^4$, ולכן החומר הרחוק מהמרכז תורם הכי הרבה.`, source: `${H}, פרק 5` },
        { id: 'to5', type: 'mcq', difficulty: 2, q: 'גיר נשבר בפיתול. איך ייראה השבר?', options: ['ישר, ניצב לציר', 'סליל בזווית 45°', 'לאורך הציר', 'אין שבר בפיתול'], answer: 1, explain: r`בגזירה טהורה המאמצים הראשיים הם $\pm\tau$, בזווית 45°. חומר שביר נכשל במתיחה, ולכן השבר הוא סליל בזווית 45°.`, source: `${H}, פרק 5` },
        { id: 'to6', type: 'mcq', difficulty: 2, q: 'אותו הספק, ומהירות הסיבוב עולה פי 2. מה קורה למומנט?', options: ['עולה פי 2', 'יורד פי 2', 'לא משתנה', 'יורד פי 4'], answer: 1, explain: r`$T=P/\omega$.`, source: `${H}, פרק 5` },
      ],
      generators: ['g-torsion-tau', 'g-shaft-power', 'g-twist'],
    },
    // ===================================================================
    {
      id: 'bending', title: 'כפיפה ומומנט התמד', en: 'Bending',
      lesson: {
        intuition: r`קורה כפופה מתקצרת בצד אחד ומתארכת בצד השני. באמצע יש **ציר ניטרלי** שבו המאמץ אפס, והמאמץ גדל ליניארית ככל שמתרחקים ממנו. לכן חומר רחוק מהציר עובד הכי קשה, ומכאן הצורה של קורת I.`,
        equations: [
          { tex: r`\sigma=\frac{M\,y}{I}`, label: 'מאמץ כפיפה' },
          { tex: r`\sigma_{max}=\frac{M\,c}{I}=\frac{M}{S}`, label: 'בסיב הקיצוני' },
          { tex: r`I_{rect}=\frac{bh^3}{12},\quad S_{rect}=\frac{bh^2}{6}`, label: 'מלבן' },
          { tex: r`I_{circ}=\frac{\pi d^4}{64}`, label: 'עיגול' },
          { tex: r`I=\bar I+A\,d^2`, label: 'משפט הצירים המקבילים' },
          { tex: r`\frac{dV}{dx}=-w,\quad \frac{dM}{dx}=V`, label: 'קשר עומס-גזירה-מומנט' },
        ],
        diagram: { fn: 'section', args: ['I', {}] },
        example: {
          q: r`חתך מלבני $40\times100$ mm (גובה 100) עם מומנט 5 kN·m. מה $\sigma_{max}$?`,
          steps: [r`I=\frac{40\cdot100^3}{12}=3.33\times10^6\ \text{mm}^4`, r`\sigma=\frac{5\times10^6\cdot50}{3.33\times10^6}=75\ \text{MPa}`],
        },
        implications: [
          r`קרש "על הצד" קשיח בהרבה מקרש שטוח: $I\propto h^3$.`,
          r`המומנט המקסימלי נמצא היכן ש-$V=0$ או מחליף סימן.`,
          r`בקורת I הפלנצ'ים נושאים את רוב מומנט הכפיפה, והדופן (web) נושאת את רוב הגזירה.`,
          r`לחומר שחלש במתיחה (בטון, ברזל יצוק) חשוב באיזה צד של הקורה נמצאת המתיחה.`,
        ],
        sources: [`${H}, פרק 6`, `${G}, עמ' 8-9`],
      },
      questions: [
        { id: 'bd1', type: 'mcq', difficulty: 2, q: 'קרש בחתך 20×100 mm. פי כמה גדל מומנט ההתמד כשמעמידים אותו על הצד (גובה 100) במקום שטוח (גובה 20)?', options: ['5', '10', '25', '125'], answer: 2, explain: r`$I\propto bh^3$: $\frac{20\cdot100^3}{100\cdot20^3}=25$. החוזק (דרך $S\propto bh^2$) גדל פי 5.`, source: `${H}, פרק 6` },
        { id: 'bd2', type: 'mcq', difficulty: 1, q: 'בכפיפה אלסטית טהורה, דרך איפה עובר הציר הניטרלי?', options: ['דרך מרכז הכובד (centroid) של החתך', 'תמיד באמצע הגובה', 'דרך הסיב העליון', 'דרך מרכז הגזירה'], answer: 0, explain: r`מהדרישה שסכום הכוחות הנורמליים בחתך יהיה אפס, הציר הניטרלי עובר דרך ה-centroid. באמצע הגובה רק כשהחתך סימטרי.`, source: `${H}, פרק 6` },
        { id: 'bd3', type: 'mcq', difficulty: 1, q: 'איפה מאמץ הכפיפה מקסימלי בחתך?', options: ['בציר הניטרלי', 'בסיבים הרחוקים ביותר מהציר הניטרלי', 'במרכז הכובד', 'מתפלג אחיד'], answer: 1, explain: r`$\sigma=My/I$, ליניארי ב-$y$.`, source: `${H}, פרק 6` },
        { id: 'bd4', type: 'tf', difficulty: 1, q: 'בקורת I, הפלנצ\'ים נושאים את רוב מומנט הכפיפה.', answer: true, explain: r`הם רחוקים מהציר הניטרלי ולכן תורמים את רוב ה-$I$.`, source: Q },
        { id: 'bd5', type: 'mcq', difficulty: 2, q: 'בדיאגרמת מומנטים, איפה נמצא המומנט המקסימלי?', options: ['תמיד באמצע', 'היכן שכוח הגזירה V שווה לאפס או מחליף סימן', 'תמיד בתמיכה', 'היכן שהעומס מקסימלי'], answer: 1, explain: r`$dM/dx=V$, ולכן קיצון של M נמצא היכן ש-$V=0$, או בקפיצה של V דרך אפס.`, source: `${G}, עמ' 8` },
        { id: 'bd6', type: 'mcq', difficulty: 3, q: 'למה משתמשים במשפט הצירים המקבילים?', options: ['לחשב I של חתך מורכב סביב הציר הניטרלי שלו', 'לחשב J בפיתול', 'למצוא את הכוחות בתמיכות', 'לחשב שקיעה'], answer: 0, explain: r`$I=\sum(\bar I_i+A_id_i^2)$, כש-$d_i$ הוא המרחק מה-centroid של כל חלק לציר הניטרלי.`, source: `${H}, נספח A` },
      ],
      generators: ['g-bending-rect', 'g-bending-beam'],
    },
    // ===================================================================
    {
      id: 'shear', title: 'מאמץ גזירה בקורות', en: 'Transverse Shear',
      lesson: {
        intuition: r`כוח גזירה בקורה גורם לשכבות להחליק זו על זו, כמו חפיסת קלפים שמכופפים. הגזירה מקסימלית בציר הניטרלי ואפס בפני השטח העליון והתחתון. זה ההפך מהכפיפה.`,
        equations: [
          { tex: r`\tau=\frac{V\,Q}{I\,b}`, label: 'נוסחת הגזירה' },
          { tex: r`Q=A'\bar y'`, label: 'מומנט ראשון של השטח שמעל הנקודה' },
          { tex: r`\tau_{max,rect}=\frac{3}{2}\frac{V}{A}`, label: 'מלבן' },
          { tex: r`\tau_{max,circ}=\frac{4}{3}\frac{V}{A}`, label: 'עיגול מלא' },
        ],
        diagram: { fn: 'section', args: ['rect', { shear: true }] },
        example: {
          q: r`$V=20$ kN בחתך מלבני $40\times100$ mm. מה $\tau_{max}$?`,
          steps: [r`\tau_{max}=1.5\cdot\frac{20000}{4000}=7.5\ \text{MPa}`],
        },
        implications: [
          r`בקורות ארוכות ודקות מאמץ הכפיפה בדרך כלל שולט. גזירה חשובה בקורות קצרות, ליד תמיכות ובדפנות דקות.`,
          r`בקורה מודבקת משכבות (glulam) או בריתוך פלנץ' לדופן, מחשבים את זרם הגזירה $q=VQ/I$ כדי לתכנן את ההדבקה או את הריתוך.`,
        ],
        sources: [`${H}, פרק 7`],
      },
      questions: [
        { id: 'sh1', type: 'mcq', difficulty: 1, q: 'איפה מאמץ הגזירה הרוחבי מקסימלי בחתך מלבני?', options: ['בפני השטח העליון', 'בציר הניטרלי', 'בפינות', 'אחיד'], answer: 1, explain: r`$Q$ מקסימלי בציר הניטרלי ואפס בקצוות. הפילוג פרבולי.`, source: `${H}, פרק 7` },
        { id: 'sh2', type: 'mcq', difficulty: 1, q: 'בקורת I, איזה חלק נושא את רוב כוח הגזירה?', options: ['הפלנצ\'ים', 'הדופן (web)', 'מתחלק שווה', 'אף אחד'], answer: 1, explain: r`הגזירה בדופן כמעט אחידה ונושאת את רוב $V$. הפלנצ'ים נושאים את הכפיפה.`, source: `${H}, פרק 7` },
        { id: 'sh3', type: 'tf', difficulty: 2, q: 'בקורות ארוכות ודקות, מאמץ הכפיפה בדרך כלל גדול בהרבה ממאמץ הגזירה.', answer: true, explain: r`היחס $\sigma/\tau$ גדל עם $L/h$. לכן בקורות ארוכות בודקים בעיקר כפיפה ושקיעה.`, source: `${H}, פרק 7` },
        { id: 'sh4', type: 'mcq', difficulty: 2, q: r`מה זה $Q$ בנוסחה $\tau=VQ/Ib$?`, options: ['מומנט ההתמד של כל החתך', 'המומנט הראשון של השטח שמעל (או מתחת) לנקודה, סביב הציר הניטרלי', 'כוח הגזירה', 'עובי החתך'], answer: 1, explain: r`$Q=A'\bar y'$: השטח שמעל הנקודה כפול המרחק של ה-centroid שלו מהציר הניטרלי.`, source: `${H}, פרק 7` },
      ],
      generators: ['g-shear-rect'],
    },
    // ===================================================================
    {
      id: 'deflection', title: 'שקיעות של קורות', en: 'Beam Deflection',
      lesson: {
        intuition: r`השקיעה תלויה ב-**קשיחות הכפיפה** $EI$: החומר ($E$) כפול הצורה ($I$). היא תלויה מאוד באורך ($L^3$ או $L^4$), ולכן קיצור קטן של המפתח עוזר הרבה. בתכן מכני השקיעה קובעת לא פחות מהחוזק, למשל בדיוק של מכונה או ביישור של מסבים.`,
        equations: [
          { tex: r`EI\,\frac{d^2y}{dx^2}=M(x)`, label: 'משוואת העקומה האלסטית' },
          { tex: r`\delta=\frac{PL^3}{3EI}`, label: 'שלוחה, כוח בקצה' },
          { tex: r`\delta=\frac{wL^4}{8EI}`, label: 'שלוחה, עומס מפוזר' },
          { tex: r`\delta=\frac{PL^3}{48EI}`, label: 'נתמכת פשוט, כוח באמצע' },
          { tex: r`\delta=\frac{5wL^4}{384EI}`, label: 'נתמכת פשוט, עומס מפוזר' },
        ],
        diagram: { fn: 'beam', args: ['cant-point', { diagrams: true }] },
        example: {
          q: r`שלוחה מפלדה באורך 1000 mm, חתך $30\times50$ mm, כוח 1000 N בקצה. מה השקיעה?`,
          steps: [r`I=\frac{30\cdot50^3}{12}=312{,}500\ \text{mm}^4`, r`\delta=\frac{1000\cdot1000^3}{3\cdot200000\cdot312500}=5.33\ \text{mm}`],
        },
        implications: [
          r`אורך כפול בשלוחה עם כוח בקצה: שקיעה פי 8.`,
          r`פלדה חזקה יותר לא מקטינה שקיעה, כי $E$ זהה. מגדילים $I$ או מקצרים $L$.`,
          r`סופרפוזיציה: כשיש כמה עומסים, מחברים את השקיעות. זה תקף כשהחומר אלסטי-ליניארי והשקיעות קטנות.`,
        ],
        sources: [`${H}, פרק 12`, `${S}, פרק 4 וטבלה A-9`, `${G}, עמ' 9`],
      },
      questions: [
        { id: 'df1', type: 'mcq', difficulty: 1, q: 'מכפילים את אורך שלוחה עם כוח בקצה. פי כמה גדלה השקיעה?', options: ['2', '4', '8', '16'], answer: 2, explain: r`$\delta\propto L^3$.`, source: `${H}, פרק 12` },
        { id: 'df2', type: 'mcq', difficulty: 1, q: 'מחליפים קורת פלדה בקורת אלומיניום זהה. מה יקרה לשקיעה?', options: ['תקטן', 'תגדל בערך פי 3', 'לא תשתנה', 'תגדל פי 10'], answer: 1, explain: r`$\delta\propto1/E$, ו-$200/70\approx2.9$.`, source: `${H}, פרק 12` },
        { id: 'df3', type: 'mcq', difficulty: 2, q: 'אותו כוח P ואותו אורך L. פי כמה שוקעת שלוחה (כוח בקצה) לעומת קורה נתמכת פשוט (כוח באמצע)?', options: ['2', '4', '16', '48'], answer: 2, explain: r`$\frac{PL^3/3}{PL^3/48}=16$.`, source: `${G}, עמ' 9` },
        { id: 'df4', type: 'tf', difficulty: 1, q: 'מעבר לפלדה עם חוזק כניעה כפול יקטין את השקיעה של הקורה.', answer: false, explain: r`השקיעה תלויה ב-$E$, לא ב-$S_y$. מקור לטעות נפוץ בראיונות.`, source: 'המוח: [[חוזק חומרים]], שיעור 1' },
        { id: 'df5', type: 'mcq', difficulty: 2, q: 'מתי מותר להשתמש בסופרפוזיציה לחישוב שקיעות?', options: ['תמיד', 'כשהחומר אלסטי-ליניארי והשקיעות קטנות', 'רק בשלוחה', 'רק בעומס מפוזר'], answer: 1, explain: r`סופרפוזיציה דורשת מערכת ליניארית: חוק הוק וגיאומטריה שכמעט לא משתנה.`, source: `${H}, פרק 12` },
      ],
      generators: ['g-defl-cant', 'g-defl-ss'],
    },
    // ===================================================================
    {
      id: 'mohr', title: 'מעגל מוהר ומאמצים ראשיים', en: "Mohr's Circle",
      lesson: {
        intuition: r`אותה נקודה בחומר "רואה" מאמצים שונים כשמסובבים את הצירים. מעגל מוהר מציג את כל הכיוונים בבת אחת. המאמצים הראשיים הם המקסימום והמינימום, ובמישורים שלהם אין גזירה. סיבוב של $\theta$ באלמנט שווה לסיבוב של $2\theta$ על המעגל.`,
        equations: [
          { tex: r`C=\frac{\sigma_x+\sigma_y}{2}`, label: 'מרכז' },
          { tex: r`R=\sqrt{\left(\frac{\sigma_x-\sigma_y}{2}\right)^2+\tau_{xy}^2}`, label: 'רדיוס' },
          { tex: r`\sigma_{1,2}=C\pm R`, label: 'מאמצים ראשיים' },
          { tex: r`\tau_{max,in\text{-}plane}=R`, label: 'גזירה מקסימלית במישור' },
          { tex: r`\tan2\theta_p=\frac{2\tau_{xy}}{\sigma_x-\sigma_y}`, label: 'זווית המישור הראשי' },
        ],
        diagram: { fn: 'mohrCircle', args: [80, 20, 30] },
        example: {
          q: r`$\sigma_x=80$, $\sigma_y=20$, $\tau_{xy}=30$ MPa. מצא את המאמצים הראשיים.`,
          steps: [r`C=50,\quad R=\sqrt{30^2+30^2}=42.4`, r`\sigma_1=92.4,\quad \sigma_2=7.6\ \text{MPa}`, r`\tau_{max}=42.4\ \text{MPa},\quad 2\theta_p=45^\circ`],
        },
        implications: [
          r`$\sigma_1+\sigma_2=\sigma_x+\sigma_y$ (אינווריאנט). זו בדיקה מהירה לחישוב.`,
          r`בגזירה טהורה $\tau$ המאמצים הראשיים הם $\pm\tau$ בזווית 45°.`,
          r`כששני המאמצים הראשיים באותו סימן, הגזירה המקסימלית **המוחלטת** היא $\sigma_1/2$ (עם $\sigma_3=0$), והיא גדולה מ-$R$.`,
        ],
        sources: [`${H}, פרק 9`, `${G}, עמ' 11`],
      },
      questions: [
        { id: 'mo1', type: 'mcq', difficulty: 1, q: r`מסובבים את אלמנט המאמץ בזווית $\theta$. בכמה זזים על מעגל מוהר?`, options: [r`$\theta$`, r`$2\theta$`, r`$\theta/2$`, r`$4\theta$`], answer: 1, explain: r`משוואות הטרנספורמציה תלויות ב-$2\theta$.`, source: `${H}, פרק 9` },
        { id: 'mo2', type: 'mcq', difficulty: 1, q: 'מה מאמץ הגזירה במישורים הראשיים?', options: ['מקסימלי', 'אפס', 'שווה ל-R', 'שווה ל-C'], answer: 1, explain: r`מאמצים ראשיים הם הנקודות על ציר $\sigma$ במעגל, ושם $\tau=0$.`, source: `${H}, פרק 9` },
        { id: 'mo3', type: 'mcq', difficulty: 2, q: r`גזירה טהורה: $\sigma_x=\sigma_y=0$, $\tau_{xy}=50$ MPa. מה המאמצים הראשיים?`, options: ['±50 MPa בזווית 45°', '50 ו-0', '±25 MPa', '100 ו-0'], answer: 0, explain: r`$C=0,\ R=50$, ולכן $\sigma_{1,2}=\pm50$.`, source: `${H}, פרק 9` },
        { id: 'mo4', type: 'mcq', difficulty: 3, q: r`מצב מאמץ מישורי עם $\sigma_1=100$ ו-$\sigma_2=40$ MPa (ו-$\sigma_3=0$). מה הגזירה המקסימלית המוחלטת?`, options: ['30 MPa', '50 MPa', '70 MPa', '100 MPa'], answer: 1, explain: r`במישור $R=30$, אבל במעגל הגדול בין $\sigma_1$ ל-$\sigma_3=0$ מתקבל $\tau=100/2=50$. ב-Tresca זה קריטי.`, source: `${H}, פרק 9` },
        { id: 'mo5', type: 'tf', difficulty: 2, q: r`$\sigma_1+\sigma_2=\sigma_x+\sigma_y$ לכל סיבוב.`, answer: true, explain: r`זה אינווריאנט ראשון של טנזור המאמץ, וזה גם פשוט $2C$.`, source: `${H}, פרק 9` },
      ],
      generators: ['g-mohr'],
    },
    // ===================================================================
    {
      id: 'failure', title: 'קריטריוני כשל: von Mises ו-Tresca', en: 'Failure Theories',
      lesson: {
        intuition: r`מבחן מתיחה נותן רק מספר אחד, $S_y$, אבל לחלק אמיתי יש מאמצים מכמה כיוונים. קריטריון כשל הופך מצב מאמץ מורכב ל**מאמץ שקול** אחד, ומשווים אותו ל-$S_y$. בחומר רקיע הכניעה נגרמת מגזירה, ולכן לחץ הידרוסטטי (שווה מכל הכיוונים) לא גורם לכניעה.`,
        equations: [
          { tex: r`\sigma'=\sqrt{\tfrac{(\sigma_1-\sigma_2)^2+(\sigma_2-\sigma_3)^2+(\sigma_3-\sigma_1)^2}{2}}`, label: 'von Mises (אנרגיית עיוות)' },
          { tex: r`\sigma'=\sqrt{\sigma_x^2-\sigma_x\sigma_y+\sigma_y^2+3\tau_{xy}^2}`, label: 'von Mises, מאמץ מישורי' },
          { tex: r`\sigma'=\sqrt{\sigma^2+3\tau^2}`, label: 'כפיפה + פיתול בציר' },
          { tex: r`\tau_{max}=\frac{\sigma_{max}-\sigma_{min}}{2}\le\frac{S_y}{2n}`, label: 'Tresca (גזירה מקסימלית)' },
          { tex: r`n=\frac{S_y}{\sigma'}`, label: 'מקדם ביטחון' },
        ],
        diagram: { fn: 'stressElement', args: [100, 0, 40] },
        example: {
          q: r`בציר: $\sigma=100$ MPa (כפיפה) ו-$\tau=40$ MPa (פיתול). $S_y=350$ MPa. מה $n$?`,
          steps: [r`\text{von Mises: }\sigma'=\sqrt{100^2+3\cdot40^2}=121.7\ \Rightarrow\ n=2.88`, r`\text{Tresca: }\sqrt{100^2+4\cdot40^2}=128.1\ \Rightarrow\ n=2.73`],
        },
        implications: [
          r`Tresca שמרני יותר מ-von Mises. ההבדל המקסימלי, כ-15%, מתקבל בגזירה טהורה.`,
          r`חוזק גזירה לכניעה: לפי von Mises $S_{sy}=0.577S_y$, ולפי Tresca $S_{sy}=0.5S_y$.`,
          r`לחומר שביר משתמשים ב-maximum normal stress או ב-Coulomb-Mohr, כי החוזק בלחיצה גדול מהחוזק במתיחה.`,
          r`תוכנות FEA מציגות בדרך כלל von Mises. זה מתאים לחומר רקיע, לא לחומר שביר.`,
        ],
        sources: [`${S}, פרק 5`],
      },
      questions: [
        { id: 'fl1', type: 'mcq', difficulty: 1, q: 'איזה קריטריון מקובל לכניעה של חומר רקיע (פלדה, אלומיניום)?', options: ['Maximum normal stress', 'von Mises (או Tresca)', 'Coulomb-Mohr', 'Goodman'], answer: 1, explain: r`חומר רקיע נכנע מגזירה. von Mises מתאים לניסויים הכי טוב, ו-Tresca פשוט ושמרני.`, source: `${S}, פרק 5` },
        { id: 'fl2', type: 'mcq', difficulty: 2, q: 'מה חוזק הגזירה לכניעה לפי von Mises?', options: [r`$0.5S_y$`, r`$0.577S_y$`, r`$0.707S_y$`, r`$S_y$`], answer: 1, explain: r`בגזירה טהורה $\sigma'=\sqrt3\,\tau$, ולכן $S_{sy}=S_y/\sqrt3=0.577S_y$.`, source: `${S}, פרק 5` },
        { id: 'fl3', type: 'tf', difficulty: 2, q: 'מאמץ הידרוסטטי גבוה מאוד (שווה בשלושת הכיוונים) גורם לכניעה לפי von Mises.', answer: false, explain: r`כש-$\sigma_1=\sigma_2=\sigma_3$ כל ההפרשים אפס ו-$\sigma'=0$. זה מתאים לניסוי: לחץ הידרוסטטי לא גורם לכניעה.`, source: `${S}, פרק 5` },
        { id: 'fl4', type: 'mcq', difficulty: 2, q: 'איזה קריטריון מתאים לברזל יצוק?', options: ['von Mises', 'Tresca', 'Coulomb-Mohr או maximum normal stress', 'אף אחד'], answer: 2, explain: r`חומר שביר, וחוזק הלחיצה שלו גדול בהרבה מחוזק המתיחה.`, source: `${S}, פרק 5` },
        { id: 'fl5', type: 'mcq', difficulty: 2, q: 'מה נכון לגבי Tresca לעומת von Mises?', options: ['Tresca תמיד פחות שמרני', 'Tresca שמרני יותר או שווה', 'הם זהים תמיד', 'Tresca מתאים רק לחומרים שבירים'], answer: 1, explain: r`המשושה של Tresca חסום בתוך האליפסה של von Mises.`, source: `${S}, פרק 5` },
      ],
      generators: ['g-vonmises', 'g-tresca'],
    },
    // ===================================================================
    {
      id: 'buckling', title: 'קריסה: נוסחת אוילר', en: 'Buckling',
      lesson: {
        intuition: r`עמוד ארוך ודק בלחיצה לא נכשל כי החומר נמעך. הוא פשוט "בורח" הצידה בבת אחת. זו אי-יציבות, והיא תלויה ב**קשיחות** ($E$, $I$) ובאורך, לא בחוזק. אפשר לנסות עם סרגל: לוחצים על הקצוות, והוא מתכופף הרבה לפני שהוא נשבר.`,
        equations: [
          { tex: r`P_{cr}=\frac{\pi^2EI}{(KL)^2}`, label: 'אוילר' },
          { tex: r`r=\sqrt{I/A},\quad \lambda=\frac{KL}{r}`, label: 'רדיוס התמד ותמירות' },
          { tex: r`\lambda_c=\pi\sqrt{\frac{2E}{S_y}}`, label: 'תמירות מעבר (Euler/Johnson)' },
          { tex: r`\sigma_{cr}=S_y-\frac{1}{E}\left(\frac{S_y\lambda}{2\pi}\right)^2`, label: 'Johnson (עמוד בינוני)' },
        ],
        diagram: { fn: 'columns', args: [] },
        example: {
          q: r`עמוד פלדה עגול בקוטר 30 mm, אורך 2 m, פרקים בשני הקצוות. מה $P_{cr}$?`,
          steps: [r`I=\frac{\pi\cdot30^4}{64}=39{,}761\ \text{mm}^4`, r`P_{cr}=\frac{\pi^2\cdot200000\cdot39761}{2000^2}=19.6\ \text{kN}`, r`\lambda=\frac{2000}{7.5}=267>\lambda_c\approx126\ \Rightarrow\ \text{Euler valid}`],
        },
        implications: [
          r`עמוד קורס סביב הציר עם $I$ **מינימלי**. בחתך מלבני זה הכיוון הדק.`,
          r`קיבוע שני הקצוות ($K=0.5$) מגדיל את עומס הקריסה פי 4 לעומת פרקים.`,
          r`בעמוד ארוך, פלדה חזקה יותר לא עוזרת, כי $E$ זהה. צינור עדיף על מוט מלא באותו משקל.`,
          r`עמוד קצר ($\lambda<\lambda_c$) נכשל בכניעה או לפי Johnson, ושם אוילר מעריך יותר מדי.`,
        ],
        sources: [`${H}, פרק 13`, `${S}, פרק 4`, `${G}, עמ' 12-13`],
      },
      questions: [
        { id: 'bk1', type: 'mcq', difficulty: 1, q: 'בעמוד ארוך ודק, מאיזו תכונת חומר תלוי עומס הקריסה?', options: [r`$S_y$`, r`$S_{ut}$`, r`$E$`, 'קשיות'], answer: 2, explain: r`$P_{cr}=\pi^2EI/(KL)^2$. אין בנוסחה חוזק.`, source: `${H}, פרק 13` },
        { id: 'bk2', type: 'mcq', difficulty: 2, q: 'משנים את הקצוות מפרקים (K=1) לקיבוע מלא (K=0.5). פי כמה גדל עומס הקריסה?', options: ['2', '4', '0.5', '0.25'], answer: 1, explain: r`$P_{cr}\propto1/K^2=1/0.25=4$.`, source: `${H}, פרק 13` },
        { id: 'bk3', type: 'mcq', difficulty: 1, q: 'סביב איזה ציר יקרוס עמוד עם חתך מלבני?', options: ['סביב הציר עם I מקסימלי', 'סביב הציר עם I מינימלי', 'אקראי', 'סביב ציר האורך'], answer: 1, explain: r`עומס הקריסה הנמוך יותר קובע, וזה הכיוון הדק.`, source: `${H}, פרק 13` },
        { id: 'bk4', type: 'tf', difficulty: 2, q: 'החלפה לפלדה בעלת חוזק גבוה מעלה את עומס הקריסה של עמוד ארוך ודק.', answer: false, explain: r`באזור אוילר רק $E$ ו-$I$ קובעים. חוזק עוזר רק לעמוד קצר או בינוני.`, source: `${S}, פרק 4` },
        { id: 'bk5', type: 'mcq', difficulty: 2, q: 'מה הערך של K לעמוד עם קצה אחד מקובע והשני חופשי (flagpole)?', options: ['0.5', '0.7', '1', '2'], answer: 3, explain: r`האורך האפקטיבי כפול, ולכן זה המקרה הגרוע מכולם.`, source: `${G}, עמ' 12` },
      ],
      generators: ['g-euler', 'g-slenderness'],
    },
    // ===================================================================
    {
      id: 'kt', title: 'ריכוזי מאמצים', en: 'Stress Concentration',
      lesson: {
        intuition: r`זרימת כוח בחלק דומה לזרימת מים בנהר. כשיש מכשול (חור, חריץ, פינה חדה), קווי הכוח נדחסים סביבו והמאמץ המקומי קופץ. $K_t$ אומר פי כמה, והוא תלוי **רק בגיאומטריה**.`,
        equations: [
          { tex: r`\sigma_{max}=K_t\,\sigma_{nom}`, label: 'מאמץ שיא' },
          { tex: r`K_f=1+q(K_t-1)`, label: 'מקדם עייפות אפקטיבי (q: רגישות לחריץ)' },
          { tex: r`K_t\approx3`, label: 'חור עגול בפלטה רחבה מאוד במתיחה' },
        ],
        diagram: { fn: 'plateHole', args: [] },
        example: {
          q: r`פלטה ברוחב 60 mm ובעובי 10 mm, חור בקוטר 15 mm, כוח 20 kN, ונתון $K_t=2.4$. מה $\sigma_{max}$?`,
          steps: [r`A_{net}=(60-15)\cdot10=450\ \text{mm}^2`, r`\sigma_{nom}=20000/450=44.4\ \text{MPa}`, r`\sigma_{max}=2.4\cdot44.4=106.7\ \text{MPa}`],
        },
        implications: [
          r`בחומר רקיע בעומס **סטטי** בדרך כלל לא מפעילים $K_t$, כי כניעה מקומית מחלקת מחדש את המאמץ. בעייפות ובחומר שביר הוא קריטי.`,
          r`להקטנה: רדיוס פילט גדול, חריצי הקלה (relief grooves), לא לשים חורים באזור עם מאמץ גבוה, ולמנוע פינות חדות.`,
          r`חשוב לבדוק אם $K_t$ בטבלה מוגדר על החתך ברוטו או על החתך נטו.`,
        ],
        sources: [`${S}, פרק 3 ונספח A-15`, `${Q}, עמ' 6`],
      },
      questions: [
        { id: 'kt1', type: 'mcq', difficulty: 1, q: r`ממה תלוי $K_t$?`, options: ['מהחומר', 'מהגיאומטריה בלבד (וסוג העמסה)', 'מגודל הכוח', 'מהטמפרטורה'], answer: 1, explain: r`$K_t$ הוא מקדם גיאומטרי. החומר נכנס דרך $q$ ב-$K_f$.`, source: `${S}, פרק 3` },
        { id: 'kt2', type: 'mcq', difficulty: 2, q: r`חלק מפלדה רקיעה בעומס סטטי בלבד. האם מכפילים ב-$K_t$?`, options: ['כן, תמיד', 'בדרך כלל לא, כי כניעה מקומית מחלקת את המאמץ', 'רק אם יש חור', 'רק באלומיניום'], answer: 1, explain: r`לפי Shigley, בחומר רקיע ובעומס סטטי בדרך כלל לא משתמשים ב-$K_t$. בעייפות ובחומר שביר משתמשים בו.`, source: `${S}, פרק 3` },
        { id: 'kt3', type: 'tf', difficulty: 1, q: 'לחור עגול קטן בפלטה רחבה במתיחה יש מקדם ריכוז מאמצים של בערך 3.', answer: true, explain: r`זה הפתרון הקלאסי של Kirsch לפלטה אינסופית.`, source: `${S}, פרק 3` },
        { id: 'kt4', type: 'mcq', difficulty: 1, q: 'מה הדרך הכי יעילה להקטין ריכוז מאמצים בכתף של ציר?', options: ['להגדיל את רדיוס הפילט', 'להקטין את הרדיוס', 'להחליף לפלדה חזקה', 'להוסיף חריץ חד'], answer: 0, explain: r`$K_t$ יורד ככל ש-$r/d$ גדל.`, source: `${S}, נספח A-15` },
        { id: 'kt5', type: 'open', difficulty: 2, q: 'שאלת ראיון: איפה עדיף להעמיס קורה ולמקם חורים?', model: r`להעמיס קרוב לתמיכות ולא באמצע מפתח ארוך. בשלוחה המומנט מקסימלי ליד הקיבוע, ובקורה על שתי תמיכות באמצע. חורים, חריצים ופינות חדות כדאי למקם הרחק מאזורי מאמץ גבוה, וקרוב לציר הניטרלי בכפיפה, בגלל ריכוזי מאמצים.`, source: `${Q}, עמ' 6` },
      ],
      generators: ['g-kt'],
    },
    // ===================================================================
    {
      id: 'fatigue', title: 'עייפות: S-N ו-Goodman', en: 'Fatigue',
      lesson: {
        intuition: r`חלק יכול להישבר ממאמץ שנמוך בהרבה מ-$S_y$, אם המאמץ חוזר מיליוני פעמים. סדק קטן נוצר בנקודה חלשה (ריכוז מאמצים, שריטה, קורוזיה) וגדל מעט בכל מחזור, עד שהחתך שנשאר נשבר בבת אחת. זה הגורם לרוב הכשלים במכונות.`,
        equations: [
          { tex: r`\sigma_m=\frac{\sigma_{max}+\sigma_{min}}{2},\quad \sigma_a=\frac{\sigma_{max}-\sigma_{min}}{2}`, label: 'מאמץ ממוצע ומשרעת' },
          { tex: r`R=\sigma_{min}/\sigma_{max}`, label: 'יחס מאמצים (R = -1 הפוך לגמרי)' },
          { tex: r`S_e'\approx0.5\,S_{ut}\ \ (S_{ut}\le1400\text{ MPa})`, label: 'הערכת גבול עייפות לפלדה' },
          { tex: r`S_e=k_ak_bk_ck_dk_ek_f\,S_e'`, label: 'מקדמי Marin' },
          { tex: r`\frac{1}{n}=\frac{\sigma_a}{S_e}+\frac{\sigma_m}{S_{ut}}`, label: 'Goodman' },
          { tex: r`n_y=\frac{S_y}{\sigma_a+\sigma_m}`, label: 'Langer (כניעה במחזור הראשון)' },
        ],
        diagram: { fn: 'goodman', args: [250, 500, 350, 150, 100] },
        example: {
          q: r`$S_e=250$, $S_y=350$, $S_{ut}=500$ MPa. נקודת עבודה: $\sigma_m=150$, $\sigma_a=100$ MPa. מה מקדם הביטחון?`,
          steps: [r`\text{Goodman: }\frac1n=\frac{100}{250}+\frac{150}{500}=0.7\Rightarrow n=1.43`, r`\text{Langer: }n_y=\frac{350}{100+150}=1.40`, r`n=\min(1.43,\,1.40)=1.40`],
        },
        implications: [
          r`משטח שבר עייפות: אזור חלק עם קווי חוף (beach marks) סביב נקודת ההתחלה, ואזור גס של השבר הסופי.`,
          r`בפלדה יש גבול עייפות (בערך ב-$10^6$ מחזורים). באלומיניום אין, ולכן מתכננים לאורך חיים סופי.`,
          r`משפרים עייפות עם ליטוש, shot peening (מאמצי לחיצה שיוריים), רדיוסים גדולים, והגנה מקורוזיה.`,
          r`מאמץ ממוצע במתיחה מזיק, ומאמץ ממוצע בלחיצה עוזר. לכן ברגים מקבלים פריטעינה.`,
        ],
        sources: [`${S}, פרק 6`, `${G}, עמ' 11-12`],
      },
      questions: [
        { id: 'fa1', type: 'mcq', difficulty: 1, q: 'מה מעידים קווי חוף (beach marks) על משטח שבר?', options: ['שבר פריך מעומס יתר', 'שבר עייפות', 'קורוזיה בלבד', 'כשל ריתוך'], answer: 1, explain: r`הם מסמנים את התקדמות הסדק לאורך הזמן.`, source: `${Q}, עמ' 6` },
        { id: 'fa2', type: 'mcq', difficulty: 1, q: 'לאיזה חומר יש גבול עייפות ברור?', options: ['אלומיניום', 'פלדה', 'נחושת', 'לכולם'], answer: 1, explain: r`בפלדה עקומת S-N נהיית אופקית. באלומיניום היא ממשיכה לרדת.`, source: `${G}, עמ' 11` },
        { id: 'fa3', type: 'mcq', difficulty: 2, q: 'למה shot peening משפר עייפות?', options: ['מגדיל את E', 'יוצר מאמצי לחיצה שיוריים בפני השטח', 'מקשה את כל החלק', 'מסיר חומר'], answer: 1, explain: r`לחיצה בפני השטח מעכבת היווצרות סדקים והתפשטותם.`, source: `${Q}, עמ' 6` },
        { id: 'fa4', type: 'mcq', difficulty: 1, q: r`העמסה הפוכה לגמרי (fully reversed). מה $R$ ומה $\sigma_m$?`, options: [r`$R=0,\ \sigma_m=\sigma_a$`, r`$R=-1,\ \sigma_m=0$`, r`$R=1,\ \sigma_m=\sigma_{max}$`, r`$R=-1,\ \sigma_m=\sigma_a$`], answer: 1, explain: r`$\sigma_{min}=-\sigma_{max}$.`, source: `${S}, פרק 6` },
        { id: 'fa5', type: 'mcq', difficulty: 2, q: 'מה נכון לגבי Soderberg לעומת Goodman?', options: ['Soderberg שמרני יותר (מחבר את Se ל-Sy)', 'Goodman שמרני יותר', 'זהים', 'Soderberg רק לאלומיניום'], answer: 0, explain: r`Soderberg משתמש ב-$S_y$ במקום ב-$S_{ut}$ על ציר $\sigma_m$.`, source: `${S}, פרק 6` },
        { id: 'fa6', type: 'tf', difficulty: 1, q: 'שיפור גימור פני השטח (ליטוש) מאריך את חיי העייפות.', answer: true, explain: r`מקדם Marin $k_a$ משקף את הגימור. משטח מחוספס מכיל מיקרו-חריצים.`, source: `${S}, פרק 6` },
      ],
      generators: ['g-goodman', 'g-endurance'],
    },
    // ===================================================================
    {
      id: 'safety', title: 'מקדם ביטחון', en: 'Factor of Safety',
      lesson: {
        intuition: r`מקדם ביטחון הוא "כמה מקום יש לנו" בין מה שהחלק יכול לשאת לבין מה שהוא נושא. הוא מכסה את מה שלא ידוע: פיזור בחומר, עומסים לא צפויים, מודל לא מדויק. תמיד צריך להגיד **מול מה**: כניעה, שבר, עייפות או קריסה.`,
        equations: [
          { tex: r`n=\frac{\text{strength}}{\text{stress}}=\frac{S}{\sigma}`, label: 'הגדרה' },
          { tex: r`n=\frac{F_{fail}}{F_{applied}}`, label: 'כשהקשר בין עומס למאמץ ליניארי' },
        ],
        diagram: null,
        example: {
          q: r`בורג בקוטר 16 mm, כוח 20 kN, $S_y=640$ MPa. מה $n$?`,
          steps: [r`\sigma=\frac{20000}{201.1}=99.5\ \text{MPa}`, r`n=\frac{640}{99.5}=6.4`],
        },
        implications: [
          r`$n$ גבוה מדי זה לא "בטוח יותר", אלא משקל ועלות מיותרים. בתעופה, למשל, מקדם הביטחון הסטנדרטי על עומס הגבול הוא 1.5.`,
          r`Shigley מבחין בין **design factor** $n_d$ (הדרישה) לבין **factor of safety** $n$ (מה שהתקבל אחרי שבחרו מידות סטנדרטיות).`,
          r`כשהקשר בין עומס למאמץ לא ליניארי (קריסה, מגע), מקדם על עומס לא שווה למקדם על מאמץ.`,
        ],
        sources: [`${S}, פרק 1`, 'המוח: [[חוזק חומרים]]'],
      },
      questions: [
        { id: 'sf1', type: 'mcq', difficulty: 1, q: r`מה המשמעות של $n<1$?`, options: ['החלק בטוח מאוד', 'צפוי כשל במצב שנבדק', 'אין משמעות', 'צריך להחליף שיטת חישוב'], answer: 1, explain: r`המאמץ גבוה מהחוזק.`, source: `${S}, פרק 1` },
        { id: 'sf2', type: 'tf', difficulty: 1, q: 'מקדם ביטחון גבוה יותר הוא תמיד תכן טוב יותר.', answer: false, explain: r`זה מוסיף משקל, עלות ולפעמים גם אינרציה ורעידות. מטרת התכן היא $n$ מתאים, לא מקסימלי.`, source: `${S}, פרק 1` },
        { id: 'sf3', type: 'mcq', difficulty: 2, q: 'מה ההבדל בין design factor לבין factor of safety לפי Shigley?', options: ['אין הבדל', 'design factor הוא הדרישה, ו-factor of safety הוא מה שהתקבל בפועל אחרי בחירת מידות', 'factor of safety רק לעייפות', 'design factor רק לריתוכים'], answer: 1, explain: r`בוחרים מידה סטנדרטית שגדולה מהמינימום, ולכן $n\ge n_d$.`, source: `${S}, פרק 1` },
        { id: 'sf4', type: 'open', difficulty: 2, q: 'שאלת ראיון: איך תבחר מקדם ביטחון לחלק חדש?', model: r`קודם בודקים אם יש תקן או דרישת לקוח שמגדירים אותו (למשל בתעופה, בכלי לחץ או במכשור רפואי). אם אין, שוקלים: כמה ידוע על העומסים, כמה פיזור יש בחומר, כמה מדויק המודל, מה המחיר של כשל (בטיחות לעומת תחזוקה), והאם יש בדיקה וניטור. מגדירים מול איזה מצב כשל: כניעה, שבר, עייפות או קריסה. אחר כך מאמתים בבדיקה.`, source: `${S}, פרק 1` },
      ],
      generators: ['g-sf'],
    },
  ],
};
