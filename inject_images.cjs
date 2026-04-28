const fs = require('fs');
let content = fs.readFileSync('src/data/templates.ts', 'utf8');

const images = {
  'ec-store': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  'ec-marketplace': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
  'ec-subscription': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
  'ec-wholesale': 'https://images.unsplash.com/photo-1586528116311-ad8ed7c83a56?auto=format&fit=crop&w=800&q=80',
  'hc-clinic': 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
  'hc-telehealth': 'https://images.unsplash.com/photo-1576091160550-2173ff9e5eb2?auto=format&fit=crop&w=800&q=80',
  'hc-pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
  'leg-lawfirm': 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
  'leg-contracts': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  'fin-invoicing': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
  'fin-expenses': 'https://images.unsplash.com/photo-1556742111-a301076d9d18?auto=format&fit=crop&w=800&q=80',
  'fin-payroll': 'https://images.unsplash.com/photo-1580519542036-ed47f3e42214?auto=format&fit=crop&w=800&q=80',
  'fs-landscaping': 'https://images.unsplash.com/photo-1558904541-efa843a96f0f?auto=format&fit=crop&w=800&q=80',
  'fs-hvac': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  'fs-plumbing': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'fs-cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  'res-pos': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'res-delivery': 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80',
  'res-catering': 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
  're-pm': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
  're-crm': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  're-listings': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'ed-lms': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=800&q=80',
  'ed-tutoring': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
  'ed-school': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  'log-fleet': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
  'log-warehouse': 'https://images.unsplash.com/photo-1586528116311-ad8ed7c83a56?auto=format&fit=crop&w=800&q=80',
  'log-dispatch': 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
  'saas-crm': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  'saas-helpdesk': 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
  'saas-pm': 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
  'saas-analytics': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  'con-pm': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
  'con-estimating': 'https://images.unsplash.com/photo-1541888014798-84227918f0ee?auto=format&fit=crop&w=800&q=80',
  'well-gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  'well-spa': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
  'well-coaching': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
  'ret-pos': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80'
};

for (const [id, url] of Object.entries(images)) {
  const targetIdStr = `id: '${id}'`;
  const idIndex = content.indexOf(targetIdStr);
  if (idIndex !== -1) {
    const endOfPrompt = content.indexOf('`,', idIndex);
    if (endOfPrompt !== -1) {
      const insertionPoint = endOfPrompt + 2;
      content = content.slice(0, insertionPoint) + `\n    previewImage: '${url}',` + content.slice(insertionPoint);
    }
  }
}

fs.writeFileSync('src/data/templates.ts', content, 'utf8');
console.log('Successfully injected preview images into templates!');
