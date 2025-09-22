const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const { generateCSATGrammarProblem } = require('./server/utils/csatGrammarGenerator');
const ProblemGenerationUtils = require('./server/utils/problemGenerationUtils');

const VOCAB_SELECTION = {
  '1. p2-no.18': 'extend',
  '2. p2-no.19': 'audition',
  '3. p2-no.20': 'routine',
  '4. p3-no.21': 'borrow',
  '5. p3-no.22': 'meditative',
  '6. p3-no.23': 'phenomena',
  '7. p3-no.24': 'correlation',
  '8. p5-no.29': 'domesticated',
  '9. p5-no.30': 'hospitality',
  '10. p5-no.31': 'euphoria',
  '11. p5-no.32': 'accumulation',
  '12. p6-no.33': 'precise',
  '13. p6-no.34': 'infrastructure',
  '14. p6-no.35': 'autonomously',
  '15. p6-no.36': 'immobile',
  '16. p7-no.37': 'friction',
  '17. p7-no.38': 'nonlinear',
  '18. p7-no.39': 'consequences',
  '19. p7-no.40': 'preconceptions',
  '20. p8-no.41~42': 'defensive',
  '21. p8-no.43~45': 'determined'
};

const VOCAB_BANK = {
  extend: {
    options: ['��� �ø���', '�Ѹ���� �ٹ̴�', '��� ���ߴ�', '��� ������'],
    answer: 1,
    explanation: '\"extend\"�� �ð��� �ø��ų� ��� �ϴٶ�� ���Դϴ�.'
  },
  audition: {
    options: ['��쳪 ������ �̱� ���� ����', '�ϼ��� ����', '������ �ڼ�', '���� ��ġ'],
    answer: 1,
    explanation: '\"audition\"�� ������ ��� ���� ���� ������ �ǹ��մϴ�.'
  },
  routine: {
    options: ['�� �ݺ��ϴ� ������ ����', '���۽����� ���', 'Ư���� ����', '�ұ�Ģ�� �Ǽ�'],
    answer: 1,
    explanation: '\"routine\"�� ����ó�� �ݺ��Ǵ� �����Դϴ�.'
  },
  borrow: {
    options: ['������ ��� ����', '���� ����', '������ �����ϴ�', '���� �����'],
    answer: 1,
    explanation: '\"borrow\"�� ���� ���� ���� ��� ������ �ǹ��Դϴ�.'
  },
  meditative: {
    options: ['������ �����ϰ� �ϴ�', '�ò����� ȥ��������', '���θ���', '������ �θ���'],
    answer: 1,
    explanation: '\"meditative\"�� ����ϵ� ������ �����ϰ� ����� ���¸� ����ŵ�ϴ�.'
  },
  phenomena: {
    options: ['�Ͼ�� ���� ���� ����', '������� ���', '�쿬�� �Ǽ�', '���� �ҹ�'],
    answer: 1,
    explanation: '\"phenomena\"�� �����Ǵ� ���� �ڿ�����ȸ ������ ���մϴ�.'
  },
  correlation: {
    options: ['���� ���õǾ� �Բ� ����', '������ �и���', '������ ����', '���� ����'],
    answer: 1,
    explanation: '\"correlation\"�� �� ��Ұ� ���� ����Ǿ� �ִٴ� �ǹ��Դϴ�.'
  },
  domesticated: {
    options: ['��鿩�� ����� �⸣�� ����', '�߻����� �ǵ��ư�', '���ڱ� �����', '����'],
    answer: 1,
    explanation: '\"domesticated\"�� ������ ��鿩�� ������ �⸦ �� ������ ���մϴ�.'
  },
  hospitality: {
    options: ['�����ϰ� �����ϰ� ������', '������ ��Ģ', '��ģ ����', '������ ����'],
    answer: 1,
    explanation: '\"hospitality\"�� �մ��� ģ���� �����ϴ� �µ��Դϴ�.'
  },
  euphoria: {
    options: ['ū ��ݰ� ȲȦ��', '���� �Ƿ�', '������', '���������� �Ҿ�'],
    answer: 1,
    explanation: '\"euphoria\"�� �ſ� ū ��ݰ� ��� ������ ���մϴ�.'
  },
  accumulation: {
    options: ['�������� ����', '���۽����� ����', '���� ����', '�ﰢ���� �ߴ�'],
    answer: 1,
    explanation: '\"accumulation\"�� � ���� ���� �׿� ���� ���� �ǹ��մϴ�.'
  },
  precise: {
    options: ['���� ��Ȯ��', '�����ϰ� Ʋ��', '������ ������', '������ �鸮��'],
    answer: 1,
    explanation: '\"precise\"�� �ſ� ��Ȯ�ϰ� ������ ���¸� ���մϴ�.'
  },
  infrastructure: {
    options: ['����� �Ǵ� �ü��� ��ġ', '����� �Ǽ�', '���� ���', '���ʿ��� ���'],
    answer: 1,
    explanation: '\"infrastructure\"�� ��ȸ�� �����ϴ� �⺻ �ü��� ���մϴ�.'
  },
  autonomously: {
    options: ['������ �Ǵ��Ͽ�', '���� ��Ű�� ��θ�', '������ ���缭', '��������'],
    answer: 1,
    explanation: '\"autonomously\"�� �ٸ� ��� ���� ���� ������ �Ǵ����� ���մϴ�.'
  },
  immobile: {
    options: ['���� �������� �ʴ�', '������ �ڶ��', '�Ҹ��� ũ�� ����', '��� ������'],
    answer: 1,
    explanation: '\"immobile\"�� �������� �ʰ� ������ �ִ� �����Դϴ�.'
  },
  friction: {
    options: ['���� ���� �������� ���� ��', '���� ���� ������', '�Ҹ��� Ű��� ��ġ', '���⸦ �����ϴ� ��'],
    answer: 1,
    explanation: '\"friction\"�� ��ü���� �������� �������� �����ϴ� ���Դϴ�.'
  },
  nonlinear: {
    options: ['������� �� �ٷ� ������� �ʴ�', '�׻� ���� �ӵ��� �����̴�', '���� �̿���', '�ڿ������� ���̴�'],
    answer: 1,
    explanation: '\"nonlinear\"�� ������ ������� �̾����� �ʴ� ����� �ǹ��մϴ�.'
  },
  consequences: {
    options: ['� �ൿ �ڿ� ������� ���', '������ ���� ��ȹ', '�Ͻ����� ���', '���ǹ��� ����'],
    answer: 1,
    explanation: '\"consequences\"�� � �ൿ���� ���� ����� ����Դϴ�.'
  },
  preconceptions: {
    options: ['�̸� ���� �ִ� �����̳� ���԰�', '���ο� �߸�ǰ', '�ڿ� ǳ��', '��Ȯ�� ������'],
    answer: 1,
    explanation: '\"preconceptions\"�� �����ϱ� ���� �̸� ǰ�� ���԰��� ���մϴ�.'
  },
  defensive: {
    options: ['�����θ� ��Ű���� �µ�', '��� ������ ǥ����', '���� ���� �ݷ���', '�����ϰ� ���� ���'],
    answer: 1,
    explanation: '\"defensive\"�� �����θ� ��ȣ�Ϸ��� �µ��� ���մϴ�.'
  },
  determined: {
    options: ['���� ������ ����', '�쿬�� ��������', '�̿� ����', '���� �����ϴ�'],
    answer: 1,
    explanation: '\"determined\"�� �ؾ߰ڴٰ� ���� �������� �����Դϴ�.'
  }
};

const SUMMARY_BANK = {
  '1. p2-no.18': {
    options: [
      '�л�ȸ���� ������ � �ð��� �÷� �޶�� ������ �����Ѵ�.',
      '�������� ����ؾ� �Ѵٰ� �����Ѵ�.',
      '�б� �޽� �޴��� �ٲ��ڴ� �����̴�.',
      '�л�ȸ ���� ������ ȫ���ϴ� ���̴�.'
    ],
    answer: 1,
    explanation: '������ ������ � �ð��� ���� 7�ñ��� ������ �޶�� ��û�̴�.'
  },
  '2. p2-no.19': {
    options: [
      'ù ����� ����� �����ϰ� ��ٸ��� ���� ���ҿ� �հ��ϴ� �̾߱��.',
      '���뿡�� �Ǽ��Ͽ� Ż���ϴ� ����̴�.',
      'ģ���� ������ �ذ��ϴ� ��ȭ�̴�.',
      '���ο� ������ ���� �����ϴ� �̾߱��.'
    ],
    answer: 1,
    explanation: '��ȭ�� ����� ����� ��� ���� ���ҿ� �հ��ϴ� �̾߱��.'
  },
  '3. p2-no.20': {
    options: [
      '���� ���� 10�� ��ƾ�� ���� �����⸦ �����Ѵٴ� �����̴�.',
      '�л����� ������ ������ �������ؾ� �Ѵٴ� �����̴�.',
      'ü���� ���� ȿ���� �����Ѵ�.',
      '������ �ٿ��� �Ѵٴ� ���� ������.'
    ],
    answer: 1,
    explanation: 'ù �� ���� �غ� ��ƾ�� ���� ���ߵ��� ���δٰ� �����Ѵ�.'
  },
  '4. p3-no.21': {
    options: [
      '�츮 ���� ���ڴ� ���ָ�ŭ �����Ǿ� ���� ���� ���� �ִٰ� �����Ѵ�.',
      '���ڴ� �� �� ���� ������ٰ� �����Ѵ�.',
      '�ΰ��� ������ ���ڸ� ����� ���ٰ� ���Ѵ�.',
      '���� ���̰� �ֱٿ����� �������ٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '���ڴ� ���� ���� ��ΰ� �Բ� ���� ���� �ڿ��̶�� �����Ѵ�.'
  },
  '5. p3-no.22': {
    options: [
      '���� ���ٱⰡ ��ü �ǰ��� ���� �ǰ� ��ο� ������ �ȴٰ� ���Ѵ�.',
      '���� ���ٱ�� �ð� �����̴� ���� ���ƾ� �Ѵٰ� ���Ѵ�.',
      '���� ���ٱ�� �������� �� �� �ִٰ� �����Ѵ�.',
      '���� ���ٱ�� ������ �Ҿ��� Ű��ٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '���� ���ٱⰡ ��� �ǰ� ������ ������Ų�ٰ� �Ұ��Ѵ�.'
  },
  '6. p3-no.23': {
    options: [
      '�ΰ��� �������� ������ ���ϴ� ������ ������ ������ ������ �����Ѵ�.',
      '������ ���� �ʾƾ� �� �� ��� �� �ִٰ� �����Ѵ�.',
      '���� ������ �ΰ��� ȥ�������� ����ٰ� ����Ѵ�.',
      '���� ����� �ڿ� ������ �ְ��Ѵٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '������ ������ Ȯ���� ������ �ʴ� ������ ���� �� �شٰ� �����Ѵ�.'
  },
  '7. p3-no.24': {
    options: [
      '��������� ���� ������ ������谡 ���� �䱸 ������ ��Ÿ�� ���̶�� �����Ѵ�.',
      '���������� ��� ���� ������ ������ �����̶�� �����Ѵ�.',
      '�ǻ���� ���������� ������ �ߴ��ؾ� �Ѵٰ� �����Ѵ�.',
      '���������� �ֱ� ��� ���Ӱ� ���۵Ǿ��ٰ� �Ұ��Ѵ�.'
    ],
    answer: 1,
    explanation: '�� ������ ������ ����Ǿ��� �� �ΰ����� ���Ŵ� �ƴ϶�� �ݹ��Ѵ�.'
  },
  '8. p5-no.29': {
    options: [
      '����ó�� �� ���� ������ �ʹ� �����ؼ� �������� ����̱� ��ƴٰ� �����Ѵ�.',
      '��� �ʽĵ����� ���� ��鿩���ٰ� ���Ѵ�.',
      '�ΰ��� ������ ����̴� �� �����ߴٰ� �����Ѵ�.',
      '���ĵ����� �ʽĵ����� ���� �شٴ� �̾߱��.'
    ],
    answer: 1,
    explanation: '���� ���� ���� ���� ������ �дп� ���� ����ȭ�� ��ƴٰ� �����Ѵ�.'
  },
  '9. p5-no.30': {
    options: [
      'ǳ�������� �������� ������ �پ��� ���谡 �־����ٰ� �����Ѵ�.',
      '���ڰ� �Ǹ� ��� �� ���� ��Ǯ�� �ȴٰ� ���Ѵ�.',
      '�����Ҽ��� �̱���� Ŀ���ٰ� �����Ѵ�.',
      '������� ���� �̸� �����Ѵٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '������ �� ������ �ʿ������� ǳ���ϸ� ������ ���� ����ٰ� ���Ѵ�.'
  },
  '10. p5-no.31': {
    options: [
      '����� ���� �ϰ� ���� �Ͽ� �����ϸ� �ٽ� ����� ������� ���ƿ´ٰ� ���Ѵ�.',
      '����� �� �� ������ ������ �����ȴٰ� �����Ѵ�.',
      '������ �ð��� ������ ���� ������� �ʴ´ٰ� �����Ѵ�.',
      '������ �ֺ� ������� ���� ������ ���� �ʴ´ٰ� ���Ѵ�.'
    ],
    answer: 1,
    explanation: '�ູ�� ���� ��� �ð��� ������ �⺻ �������� �ǵ��ư��ٰ� �����Ѵ�.'
  },
  '11. p5-no.32': {
    options: [
      '�Ƶ������ ���̸� ���� �����ϴٴ� ��ȣ�� ���� ���� �ڰ� ����ٰ� �����Ѵ�.',
      '���� �����Ա⿡ ���� ������ ���� �� �ִٰ� ���Ѵ�.',
      'ī������ ���� �ʿ伺�� ������ ���شٰ� �����Ѵ�.',
      '���� ���̸� ���� �ڵ����� �����Ѵٰ� ���Ѵ�.'
    ],
    answer: 1,
    explanation: '�Ƶ���� �������� ���� �� ������ ä��� �Ѵٰ� �Ұ��Ѵ�.'
  },
  '12. p6-no.33': {
    options: [
      '��ġ�� ��Ȯ���� ��� ������ ���� �ٸ��� �������ٰ� �����Ѵ�.',
      '�¾������ �Ÿ��� ��Ȯ�� �����Ǿ��ٰ� �ڶ��Ѵ�.',
      '��Ȯ�Ǽ��� ���̷��� ���ڸ� ������ �Ѵٰ� �����Ѵ�.',
      '���� ���� �Ÿ��� �߿����� �ʴٰ� ���Ѵ�.'
    ],
    answer: 1,
    explanation: '���е��� Ȱ�� ������ ���� �ٸ��� �޾Ƶ鿩���ٰ� �����Ѵ�.'
  },
  '13. p6-no.34': {
    options: [
      '����������� ��ȯ�Ϸ��� ���� ��� �ü��� ���� ���� ȭ�����Ḧ �� ��� �Ѵٰ� �����Ѵ�.',
      '����������� ���� ���� ���� �ʴ´ٰ� �����Ѵ�.',
      'ȭ������ ����� �̹� ������ �ߴܵǾ��ٰ� �Ұ��Ѵ�.',
      '��������� ����� ������ �ڶ󳭴ٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '��ȯ ���翡 ��� �������� ����� �Բ� ����ؾ� �Ѵٰ� ����Ѵ�.'
  },
  '14. p6-no.35': {
    options: [
      '���������� �ΰ��� ���ó�� �����ϴ� ��踦 �޲� �Դٰ� �Ұ��Ѵ�.',
      '�κ��� �ֱٿ����� ó�� ���Ǿ��ٰ� ���Ѵ�.',
      'Ʃ���� ��谡 ������ �� ���ٰ� �����ߴٰ� ���Ѵ�.',
      '�ΰ������� �ΰ��� ������ ���ִ� ����̶�� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '�� ��ȭ���� ���� �������� �ΰ��� ������ ��踦 ����� �Դٰ� �����Ѵ�.'
  },
  '15. p6-no.36': {
    options: [
      '�縷 �ź��̴� ���� �����ϴ� �汤 ���п� �������� ��ƾ�ٰ� �����Ѵ�.',
      '�縷 �ź��̴� ������ ���� ������ �����Ѵٰ� ���Ѵ�.',
      '�ź��̴� ��� ���� ���̴� �� ���� �� ���ٰ� �����Ѵ�.',
      '�ź��̴� �������� ���� ���� �ʴ´ٰ� �Ұ��Ѵ�.'
    ],
    answer: 1,
    explanation: '�ź��̴� �汤�� ���� �����ϹǷ� �Ժη� ��� �ø��� �� �ȴٰ� ����Ѵ�.'
  },
  '16. p7-no.37': {
    options: [
      '�����Ű� ������ ���ߴ� ������ ���������� ���� �����Ѵ�.',
      '�����Ŵ� ���� ��� �׻� ���� �ӵ��� �޸��ٰ� ���Ѵ�.',
      '�ٶ��� �����Ÿ� ���� �� �������� �Ѵٰ� �����Ѵ�.',
      '�극��ũ�� ���⸦ ������ ���� ��ġ��� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '�극��ũ�� ���� ���� �� �������� �ӵ��� ���δٰ� �����Ѵ�.'
  },
  '17. p7-no.38': {
    options: [
      '���� ���� �ý����� ���ϴ� ����� �ٷ� ã�� ��ĥ �� �ִٰ� �����Ѵ�.',
      '���� ������ �ʸ��� �ݵ�� ó������ ������ �ٽ� ���� �Ѵٰ� ���Ѵ�.',
      '������ ������ ���̺��� �����ٰ� �����Ѵ�.',
      '���� ������ ȿ���� ���� ���� �� ���ٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '���� ������ ���� ���ٰ� ���� ������ �����ϴٰ� �Ұ��Ѵ�.'
  },
  '18. p7-no.39': {
    options: [
      '���������� ���� ����� �ǵ��� ��� ��ο��� ������ �� ���ؾ� �Ѵٰ� �����Ѵ�.',
      '���� ������ ������ �ൿ�� �߿����� �ʴٰ� ���Ѵ�.',
      '�Ǽ��� ���� ����� ������ ���������� ���ϴٰ� ���Ѵ�.',
      '����� ������ �ǵ��� ���� ������ٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '���� �ǵ��� ���� �ൿ ����� ��� �ʿ��ϴٰ� �̾߱��Ѵ�.'
  },
  '19. p7-no.40': {
    options: [
      '�츮�� ���ǰ��� ����� ���� ������ ���԰��� ���� ���ٰ� �����Ѵ�.',
      '������ ������� �� �ְ��Ѵٰ� �����Ѵ�.',
      '����� ���� �׻� ī�޶�� �Ȱ��� ���ٰ� ���Ѵ�.',
      '����� � ��ü�� �̸� ���ø��� ���Ѵٰ� ���Ѵ�.'
    ],
    answer: 1,
    explanation: '���԰��� �þ߸� ������ ī�޶�ó�� ���������� ���� ��ƴٰ� ���Ѵ�.'
  },
  '20. p8-no.41~42': {
    options: [
      '��May I help you?����� ������ ���� ��������� ����� �ǸŸ� ���� �� �ִٰ� �����Ѵ�.',
      '��May I help you?���� ���� ���� �ູ�ϰ� ����ٰ� �����Ѵ�.',
      '�Ǹſ��� ���� �Ƴ��� ���� �ּ��̶�� ���Ѵ�.',
      '��� ���� ������ �ޱ� �Ⱦ��Ѵٰ� �����Ѵ�.'
    ],
    answer: 1,
    explanation: '�������� �λ纸�� ���� ������ ���� ����ϰ� �Ѵٰ� �����Ѵ�.'
  },
  '21. p8-no.43~45': {
    options: [
      '�ڽ��� ����� ��Ȳ������ ������ �������� ���� �ҳ�� �׸� ���� ������ �������� ���Ѵ�.',
      '���� �Ҿ���� �л��� ������ �Ű��ϴ� ����̴�.',
      '�������� ���� �л����� ���� �޴� �̾߱��.',
      '���簡 �л����� ������ ���ִ� ����̴�.'
    ],
    answer: 1,
    explanation: '�������� �ʴ� ������ ���� ģ���� �ִ� ���θ� ���� �̾߱��.'
  }
};

function underlineWord(passage, word) {
  const regex = new RegExp(`\\b(${word})\\b`, 'i');
  if (!regex.test(passage)) return passage;
  return passage.replace(regex, (match) => `<u>${match}</u>`);
}

(async () => {
  try {
    const rawText = fs.readFileSync('tmp_pdf_text.txt', 'utf8');
    const parser = new NewPDFParser();
    const parsed = await parser.parse(rawText);

    const grammarProblems = [];
    const vocabularyProblems = [];
    const summaryProblems = [];
    const failures = [];

    parsed.passages.forEach((passage, index) => {
      const source = parsed.sources[index] || `Passage ${index + 1}`;

      // Grammar
      try {
        const grammar = generateCSATGrammarProblem(passage, { seed: index + 1 });
        grammar.metadata = {
          ...(grammar.metadata || {}),
          source,
          passageIndex: index + 1
        };
        grammarProblems.push(grammar);
      } catch (err) {
        failures.push({ type: 'grammar', source, reason: err.message });
      }

      // Vocabulary
      const vocabKey = VOCAB_SELECTION[source];
      if (vocabKey && VOCAB_BANK[vocabKey]) {
        const vocabInfo = VOCAB_BANK[vocabKey];
        const questionText = underlineWord(passage, vocabKey);
        vocabularyProblems.push({
          type: 'vocabulary',
          question: '���ƻ� ���� ģ �ܾ�� �ǹ̰� ���� ����� ����?',
          text: questionText,
          options: vocabInfo.options,
          answer: String(vocabInfo.answer),
          explanation: vocabInfo.explanation,
          metadata: {
            word: vocabKey,
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'vocabulary', source, reason: '���� ��Ī �ܾ� ����' });
      }

      // Summary
      const summaryInfo = SUMMARY_BANK[source];
      if (summaryInfo) {
        summaryProblems.push({
          type: 'summary',
          question: '���� ���� ������ ���� ������ ����?',
          mainText: passage,
          options: summaryInfo.options,
          answer: String(summaryInfo.answer),
          explanation: summaryInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'summary', source, reason: '��� ���� ������ ����' });
      }
    });

    const output = {
      documentTitle: parsed.title,
      generatedAt: new Date().toISOString(),
      counts: {
        grammar: grammarProblems.length,
        vocabulary: vocabularyProblems.length,
        summary: summaryProblems.length
      },
      grammar: grammarProblems,
      vocabulary: vocabularyProblems,
      summary: summaryProblems,
      failures
    };

    fs.writeFileSync('generated_additional_problems.json', JSON.stringify(output, null, 2), 'utf8');
    console.log(`Grammar ${grammarProblems.length}, Vocabulary ${vocabularyProblems.length}, Summary ${summaryProblems.length}. Failures: ${failures.length}`);
  } catch (error) {
    console.error('Failed to generate additional problems:', error);
    process.exit(1);
  }
})();
