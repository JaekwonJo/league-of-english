const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const { generateCSATGrammarProblem } = require('./server/utils/csatGrammarGenerator');


const VOCAB_SELECTION = {
  "1. p2-no.18": "extend",
  "2. p2-no.19": "audition",
  "3. p2-no.20": "routine",
  "4. p3-no.21": "borrow",
  "5. p3-no.22": "meditative",
  "6. p3-no.23": "phenomena",
  "7. p3-no.24": "correlation",
  "8. p5-no.29": "domesticated",
  "9. p5-no.30": "hospitality",
  "10. p5-no.31": "euphoria",
  "11. p5-no.32": "accumulation",
  "12. p6-no.33": "precise",
  "13. p6-no.34": "infrastructure",
  "14. p6-no.35": "autonomously",
  "15. p6-no.36": "immobile",
  "16. p7-no.37": "friction",
  "17. p7-no.38": "nonlinear",
  "18. p7-no.39": "consequences",
  "19. p7-no.40": "preconceptions",
  "20. p8-no.41~42": "defensive",
  "21. p8-no.43~45": "determined"
};
const VOCAB_BANK = {
  extend: {
    options: ['��� �ø���', '�Ѹ���� �ٹ̴�', '��� ���ߴ�', '��� ������'],
    answer: 1,
    explanation: 'extend�� �ð��� �ø��ų� ��� �ϴٶ�� ���Դϴ�.'
  },
  audition: {
    options: ['��쳪 ������ �̱� ���� ����', '�ϼ��� ����', '������ �ڼ�', '���� ��ġ'],
    answer: 1,
    explanation: 'audition�� ������ ��� ���� ���� ������ �ǹ��մϴ�.'
  },
  routine: {
    options: ['�� �ݺ��ϴ� ������ ����', '���۽����� ���', 'Ư���� ����', '�ұ�Ģ�� �Ǽ�'],
    answer: 1,
    explanation: 'routine�� ����ó�� �ݺ��Ǵ� �����Դϴ�.'
  },
  borrow: {
    options: ['������ ��� ����', '���� ����', '������ �����ϴ�', '���� �����'],
    answer: 1,
    explanation: 'borrow�� ���� ���� ���� ��� ������ �ǹ��Դϴ�.'
  },
  meditative: {
    options: ['������ �����ϰ� �ϴ�', '�ò����� ȥ��������', '���θ���', '������ �θ���'],
    answer: 1,
    explanation: 'meditative�� ����ϵ� ������ �����ϰ� ����� ���¸� ����ŵ�ϴ�.'
  },
  phenomena: {
    options: ['�Ͼ�� ���� ���� ����', '������� ���', '�쿬�� �Ǽ�', '���� �ҹ�'],
    answer: 1,
    explanation: 'phenomena�� �����Ǵ� ���� �ڿ�����ȸ ������ ���մϴ�.'
  },
  correlation: {
    options: ['���� ���õǾ� �Բ� ����', '������ �и���', '������ ����', '���� ����'],
    answer: 1,
    explanation: 'correlation�� �� ��Ұ� ���� ����Ǿ� �ִٴ� �ǹ��Դϴ�.'
  },
  domesticated: {
    options: ['��鿩�� ����� �⸣�� ����', '�߻����� �ǵ��ư�', '���ڱ� �����', '����'],
    answer: 1,
    explanation: 'domesticated�� ������ ��鿩�� ������ �⸦ �� ������ ���մϴ�.'
  },
  hospitality: {
    options: ['�����ϰ� �����ϰ� ������', '������ ��Ģ', '��ģ ����', '������ ����'],
    answer: 1,
    explanation: 'hospitality�� �մ��� ģ���� �����ϴ� �µ��Դϴ�.'
  },
  euphoria: {
    options: ['ū ��ݰ� ȲȦ��', '���� �Ƿ�', '������', '���������� �Ҿ�'],
    answer: 1,
    explanation: 'euphoria�� �ſ� ū ��ݰ� ��� ������ ���մϴ�.'
  },
  accumulation: {
    options: ['�������� ����', '���۽����� ����', '���� ����', '�ﰢ���� �ߴ�'],
    answer: 1,
    explanation: 'accumulation�� � ���� ���� �׿� ���� ���� �ǹ��մϴ�.'
  },
  precise: {
    options: ['���� ��Ȯ��', '�����ϰ� Ʋ��', '������ ������', '������ �鸮��'],
    answer: 1,
    explanation: 'precise�� �ſ� ��Ȯ�ϰ� ������ ���¸� ���մϴ�.'
  },
  infrastructure: {
    options: ['����� �Ǵ� �ü��� ��ġ', '����� �Ǽ�', '���� ���', '���ʿ��� ���'],
    answer: 1,
    explanation: 'infrastructure�� ��ȸ�� �����ϴ� �⺻ �ü��� ���մϴ�.'
  },
  autonomously: {
    options: ['������ �Ǵ��Ͽ�', '���� ��Ű�� ��θ�', '������ ���缭', '��������'],
    answer: 1,
    explanation: 'autonomously�� �ٸ� ��� ���� ���� ������ �Ǵ����� ���մϴ�.'
  },
  immobile: {
    options: ['���� �������� �ʴ�', '������ �ڶ��', '�Ҹ��� ũ�� ����', '��� ������'],
    answer: 1,
    explanation: 'immobile�� �������� �ʰ� ������ �ִ� �����Դϴ�.'
  },
  friction: {
    options: ['���� ���� �������� ���� ��', '���� ���� ������', '�Ҹ��� Ű��� ��ġ', '���⸦ �����ϴ� ��'],
    answer: 1,
    explanation: 'friction�� ��ü���� �������� �������� �����ϴ� ���Դϴ�.'
  },
  nonlinear: {
    options: ['������� �� �ٷ� ������� �ʴ�', '�׻� ���� �ӵ��� �����̴�', '���� �̿���', '�ڿ������� ���̴�'],
    answer: 1,
    explanation: 'nonlinear�� ������ ������� �̾����� �ʴ� ����� �ǹ��մϴ�.'
  },
  consequences: {
    options: ['� �ൿ �ڿ� ������� ���', '������ ���� ��ȹ', '�Ͻ����� ���', '���ǹ��� ����'],
    answer: 1,
    explanation: 'consequences�� � �ൿ���� ���� ����� ����Դϴ�.'
  },
  preconceptions: {
    options: ['�̸� ���� �ִ� �����̳� ���԰�', '���ο� �߸�ǰ', '�ڿ� ǳ��', '��Ȯ�� ������'],
    answer: 1,
    explanation: 'preconceptions�� �����ϱ� ���� �̸� ǰ�� ���԰��� ���մϴ�.'
  },
  defensive: {
    options: ['�����θ� ��Ű���� �µ�', '��� ������ ǥ����', '���� ���� �ݷ���', '�����ϰ� ���� ���'],
    answer: 1,
    explanation: 'defensive�� �����θ� ��ȣ�Ϸ��� �µ��� ���մϴ�.'
  },
  determined: {
    options: ['���� ������ ����', '�쿬�� ��������', '�̿� ����', '���� �����ϴ�'],
    answer: 1,
    explanation: 'determined�� �ؾ߰ڴٰ� ���� �������� �����Դϴ�.'
  }
};
const SUMMARY_BANK = {
  "1. p2-no.18": {
    options: [
      "�л�ȸ���� ������ � �ð��� �÷� �޶�� ������ �����Ѵ�.",
      "�������� ����ؾ� �Ѵٰ� �����Ѵ�.",
      "�б� �޽� �޴��� �ٲ��ڴ� �����̴�.",
      "�л�ȸ ���� ������ ȫ���ϴ� ���̴�."
    ],
    answer: 1,
    explanation: "������ � �ð��� ���� 7�ñ��� ������ �޶�� ��û�̴�."
  },
  "2. p2-no.19": {
    options: [
      "ù ����� ����� �����ϰ� ��ٸ��� ���� ���ҿ� �հ��ϴ� �̾߱��.",
      "���뿡�� �Ǽ��Ͽ� Ż���ϴ� ����̴�.",
      "ģ���� ������ �ذ��ϴ� ��ȭ�̴�.",
      "���ο� ������ ���� �����ϴ� �̾߱��."
    ],
    answer: 1,
    explanation: "��ȭ�� ����� ����� ��� ���� ���ҿ� �հ��ϴ� �̾߱��."
  },
  "3. p2-no.20": {
    options: [
      "���� ���� 10�� ��ƾ�� ���� �����⸦ �����Ѵٴ� �����̴�.",
      "�л����� ������ ������ �������ؾ� �Ѵٴ� �����̴�.",
      "ü���� ���� ȿ���� �����Ѵ�.",
      "������ �ٿ��� �Ѵٴ� ���� ������."
    ],
    answer: 1,
    explanation: "ù �� ���� �غ� ��ƾ�� ���� ���ߵ��� ���δٰ� �����Ѵ�."
  },
  "4. p3-no.21": {
    options: [
      "�츮 ���� ���ڴ� ���ָ�ŭ �����Ǿ� ���� ���� ���� �ִٰ� �����Ѵ�.",
      "���ڴ� �� �� ���� ������ٰ� �����Ѵ�.",
      "�ΰ��� ������ ���ڸ� ����� ���ٰ� ���Ѵ�.",
      "���� ���̰� �ֱٿ����� �������ٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "���ڴ� ���� ���� ��ΰ� �Բ� ���� ���� �ڿ��̶�� �����Ѵ�."
  },
  "5. p3-no.22": {
    options: [
      "���� ���ٱⰡ ��ü �ǰ��� ���� �ǰ� ��ο� ������ �ȴٰ� ���Ѵ�.",
      "���� ���ٱ�� �ð� �����̴� ���� ���ƾ� �Ѵٰ� ���Ѵ�.",
      "���� ���ٱ�� �������� �� �� �ִٰ� �����Ѵ�.",
      "���� ���ٱ�� ������ �Ҿ��� Ű��ٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "���� ���ٱⰡ ��� �ǰ� ������ ������Ų�ٰ� �Ұ��Ѵ�."
  },
  "6. p3-no.23": {
    options: [
      "�ΰ��� �������� ������ ���ϴ� ������ ������ ������ ������ �����Ѵ�.",
      "������ ���� �ʾƾ� �� �� ��� �� �ִٰ� �����Ѵ�.",
      "���� ������ �ΰ��� ȥ�������� ����ٰ� ����Ѵ�.",
      "���� ����� �ڿ� ������ �ְ��Ѵٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "������ ������ Ȯ���� ������ �ʴ� ������ ���� �� �شٰ� �����Ѵ�."
  },
  "7. p3-no.24": {
    options: [
      "��������� ���� ������ ������谡 ���� �䱸 ������ ��Ÿ�� ���̶�� �����Ѵ�.",
      "���������� ��� ���� ������ ������ �����̶�� �����Ѵ�.",
      "�ǻ���� ���������� ������ �ߴ��ؾ� �Ѵٰ� �����Ѵ�.",
      "���������� �ֱ� ��� ���Ӱ� ���۵Ǿ��ٰ� �Ұ��Ѵ�."
    ],
    answer: 1,
    explanation: "�� ������ ������ ����Ǿ��� �� �ΰ����� ���Ŵ� �ƴ϶�� �ݹ��Ѵ�."
  },
  "8. p5-no.29": {
    options: [
      "����ó�� �� ���� ������ �ʹ� �����ؼ� �������� ����̱� ��ƴٰ� �����Ѵ�.",
      "��� �ʽĵ����� ���� ��鿩���ٰ� ���Ѵ�.",
      "�ΰ��� ������ ����̴� �� �����ߴٰ� �����Ѵ�.",
      "���ĵ����� �ʽĵ����� ���� �شٴ� �̾߱��."
    ],
    answer: 1,
    explanation: "���� ���� ���� ���� ������ �дп� ���� ����ȭ�� ��ƴٰ� �����Ѵ�."
  },
  "9. p5-no.30": {
    options: [
      "ǳ�������� �������� ������ �پ��� ���谡 �־����ٰ� �����Ѵ�.",
      "���ڰ� �Ǹ� ��� �� ���� ��Ǯ�� �ȴٰ� ���Ѵ�.",
      "�����Ҽ��� �̱���� Ŀ���ٰ� �����Ѵ�.",
      "������� ���� �̸� �����Ѵٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "������ �� ������ �ʿ������� ǳ���ϸ� ������ ���� ����ٰ� ���Ѵ�."
  },
  "10. p5-no.31": {
    options: [
      "����� ���� �ϰ� ���� �Ͽ� �����ϸ� �ٽ� ����� ������� ���ƿ´ٰ� ���Ѵ�.",
      "����� �� �� ������ ������ �����ȴٰ� �����Ѵ�.",
      "������ �ð��� ������ ���� ������� �ʴ´ٰ� �����Ѵ�.",
      "������ �ֺ� ������� ���� ������ ���� �ʴ´ٰ� ���Ѵ�."
    ],
    answer: 1,
    explanation: "�ູ�� ���� ��� �ð��� ������ �⺻ �������� �ǵ��ư��ٰ� �����Ѵ�."
  },
  "11. p5-no.32": {
    options: [
      "�Ƶ������ ���̸� ���� �����ϴٴ� ��ȣ�� ���� ���� �ڰ� ����ٰ� �����Ѵ�.",
      "���� �����Ա⿡ ���� ������ ���� �� �ִٰ� ���Ѵ�.",
      "ī������ ���� �ʿ伺�� ������ ���شٰ� �����Ѵ�.",
      "���� ���̸� ���� �ڵ����� �����Ѵٰ� ���Ѵ�."
    ],
    answer: 1,
    explanation: "�Ƶ���� �������� ���� �� ������ ä��� �Ѵٰ� �Ұ��Ѵ�."
  },
  "12. p6-no.33": {
    options: [
      "��ġ�� ��Ȯ���� ��� ������ ���� �ٸ��� �������ٰ� �����Ѵ�.",
      "�¾������ �Ÿ��� ��Ȯ�� �����Ǿ��ٰ� �ڶ��Ѵ�.",
      "��Ȯ�Ǽ��� ���̷��� ���ڸ� ������ �Ѵٰ� �����Ѵ�.",
      "���� ���� �Ÿ��� �߿����� �ʴٰ� ���Ѵ�."
    ],
    answer: 1,
    explanation: "���е��� Ȱ�� ������ ���� �ٸ��� �޾Ƶ鿩���ٰ� �����Ѵ�."
  },
  "13. p6-no.34": {
    options: [
      "����������� ��ȯ�Ϸ��� ���� ��� �ü��� ���� ���� ȭ�����Ḧ �� ��� �Ѵٰ� �����Ѵ�.",
      "����������� ���� ���� ���� �ʴ´ٰ� �����Ѵ�.",
      "ȭ������ ����� �̹� ������ �ߴܵǾ��ٰ� �Ұ��Ѵ�.",
      "��������� ����� ������ �ڶ󳭴ٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "��ȯ ���翡 ��� �������� ����� �Բ� ����ؾ� �Ѵٰ� ����Ѵ�."
  },
  "14. p6-no.35": {
    options: [
      "���������� �ΰ��� ���ó�� �����ϴ� ��踦 �޲� �Դٰ� �Ұ��Ѵ�.",
      "�κ��� �ֱٿ����� ó�� ���Ǿ��ٰ� ���Ѵ�.",
      "Ʃ���� ��谡 ������ �� ���ٰ� �����ߴٰ� ���Ѵ�.",
      "�ΰ������� �ΰ��� ������ ���ִ� ����̶�� �����Ѵ�."
    ],
    answer: 1,
    explanation: "�� ��ȭ���� ���� �������� �ΰ��� ������ ��踦 ����� �Դٰ� �����Ѵ�."
  },
  "15. p6-no.36": {
    options: [
      "�縷 �ź��̴� ���� �����ϴ� �汤 ���п� �������� ��ƾ�ٰ� �����Ѵ�.",
      "�縷 �ź��̴� ������ ���� ������ �����Ѵٰ� ���Ѵ�.",
      "�ź��̴� ��� ���� ���̴� �� ���� �� ���ٰ� �����Ѵ�.",
      "�ź��̴� �������� ���� ���� �ʴ´ٰ� �Ұ��Ѵ�."
    ],
    answer: 1,
    explanation: "�ź��̴� �汤�� ���� �����ϹǷ� �Ժη� ��� �ø��� �� �ȴٰ� ����Ѵ�."
  },
  "16. p7-no.37": {
    options: [
      "�����Ű� ������ ���ߴ� ������ ���������� ���� �����Ѵ�.",
      "�����Ŵ� ���� ��� �׻� ���� �ӵ��� �޸��ٰ� ���Ѵ�.",
      "�ٶ��� �����Ÿ� ���� �� �������� �Ѵٰ� �����Ѵ�.",
      "�극��ũ�� ���⸦ ������ ���� ��ġ��� �����Ѵ�."
    ],
    answer: 1,
    explanation: "�극��ũ�� ���� ���� �� �������� �ӵ��� ���δٰ� �����Ѵ�."
  },
  "17. p7-no.38": {
    options: [
      "���� ���� �ý����� ���ϴ� ����� �ٷ� ã�� ��ĥ �� �ִٰ� �����Ѵ�.",
      "���� ������ �ʸ��� �ݵ�� ó������ ������ �ٽ� ���� �Ѵٰ� ���Ѵ�.",
      "������ ������ ���̺��� �����ٰ� �����Ѵ�.",
      "���� ������ ȿ���� ���� ���� �� ���ٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "���� ������ ���� ���ٰ� ���� ������ �����ϴٰ� �Ұ��Ѵ�."
  },
  "18. p7-no.39": {
    options: [
      "���������� ���� ����� �ǵ��� ��� ��ο��� ������ �� ���ؾ� �Ѵٰ� �����Ѵ�.",
      "���� ������ ������ �ൿ�� �߿����� �ʴٰ� ���Ѵ�.",
      "�Ǽ��� ���� ����� ������ ���������� ���ϴٰ� ���Ѵ�.",
      "����� ������ �ǵ��� ���� ������ٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "���� �ǵ��� ���� �ൿ ����� ��� �ʿ��ϴٰ� �̾߱��Ѵ�."
  },
  "19. p7-no.40": {
    options: [
      "�츮�� ���ǰ��� ����� ���� ������ ���԰��� ���� ���ٰ� �����Ѵ�.",
      "������ ������� �� �ְ��Ѵٰ� �����Ѵ�.",
      "����� ���� �׻� ī�޶�� �Ȱ��� ���ٰ� ���Ѵ�.",
      "����� � ��ü�� �̸� ���ø��� ���Ѵٰ� ���Ѵ�."
    ],
    answer: 1,
    explanation: "���԰��� �þ߸� ������ ī�޶�ó�� ���������� ���� ��ƴٰ� ���Ѵ�."
  },
  "20. p8-no.41~42": {
    options: [
      "��May I help you?����� ������ ���� ��������� ����� �ǸŸ� ���� �� �ִٰ� �����Ѵ�.",
      "��May I help you?���� ���� ���� �ູ�ϰ� ����ٰ� �����Ѵ�.",
      "�Ǹſ��� ���� �Ƴ��� ���� �ּ��̶�� ���Ѵ�.",
      "��� ���� ������ �ޱ� �Ⱦ��Ѵٰ� �����Ѵ�."
    ],
    answer: 1,
    explanation: "�������� �λ纸�� ���� ������ ���� ����ϰ� �Ѵٰ� �����Ѵ�."
  },
  "21. p8-no.43~45": {
    options: [
      "�ڽ��� ����� ��Ȳ������ ������ �������� ���� �ҳ�� �׸� ���� ������ �������� ���Ѵ�.",
      "���� �Ҿ���� �л��� ������ �Ű��ϴ� ����̴�.",
      "�������� ���� �л����� ���� �޴� �̾߱��.",
      "���簡 �л����� ������ ���ִ� ����̴�."
    ],
    answer: 1,
    explanation: "�������� �ʴ� ������ ���� ģ���� �ִ� ���θ� ���� �̾߱��."
  }
};
const BLANK_BANK = {
  "1. p2-no.18": {
    text: "Therefore, I'd like to ask you to _____ so that students can study after regular class hours.",
    options: [
      "�� shorten the library's schedule to 3 p.m.",
      "�� extend the library's operating hours to 7 p.m.",
      "�� close the library on weekdays.",
      "�� move the library to a smaller room.",
      "�� limit the library to faculty members only."
    ],
    answer: 2,
    explanation: "������ ������ � �ð��� ���� 7�ñ��� ������ �޶�� ��û�̴�."
  },
  "2. p2-no.19": {
    text: "That meant the casting director would call very soon with the results of my first _____ for a musical part in The Wizard of Oz.",
    options: [
      "�� rehearsal",
      "�� audition",
      "�� newspaper review",
      "�� stage construction",
      "�� costume fitting"
    ],
    answer: 2,
    explanation: "��ȭ�� ��ٸ��� ���� ù ����� �������."
  },
  "3. p2-no.20": {
    text: "In summary, you should establish an opening _____ to develop your class with an effective start.",
    options: [
      "�� punishment",
      "�� routine",
      "�� competition",
      "�� distraction",
      "�� survey"
    ],
    answer: 2,
    explanation: "���� ���� ��ƾ�� ������ ������ ȿ�������� ���۵ȴ�."
  },
  "4. p3-no.21": {
    text: "You don't 'own' the atoms that make up your body; you _____ them.",
    options: [
      "�� manufacture",
      "�� borrow",
      "�� waste",
      "�� analyze",
      "�� freeze"
    ],
    answer: 2,
    explanation: "�츮 ���� ���ڴ� ���� ���� ���̶�� �����Ѵ�."
  },
  "5. p3-no.22": {
    text: "Tending to plants can be incredibly _____ and meditative.",
    options: [
      "�� calming",
      "�� chaotic",
      "�� risky",
      "�� loud",
      "�� impatient"
    ],
    answer: 1,
    explanation: "���� ���ٱ�� ������ �����ϰ� �Ѵٰ� �ߴ�."
  },
  "6. p3-no.23": {
    text: "In some cases, this consists of simply _____ that feed into our normal sensory inputs.",
    options: [
      "�� damping noises",
      "�� amplifying signals",
      "�� blocking colors",
      "�� erasing images",
      "�� randomizing sounds"
    ],
    answer: 2,
    explanation: "������ ������ ������ ��ȣ�� �����Ѵٰ� �����Ѵ�."
  },
  "7. p3-no.24": {
    text: "Opponents of research reject this _____ because it mistakes correlation for proof of causation.",
    options: [
      "�� habit",
      "�� inference",
      "�� celebration",
      "�� apology",
      "�� lottery"
    ],
    answer: 2,
    explanation: "���������� ���� ������ �����״ٴ� �߷��� �ݹ��Ѵ�."
  },
  "8. p5-no.29": {
    text: "If put into an enclosure, they are likely to _____, and either die of shock or hit themselves against the fence.",
    options: [
      "�� relax",
      "�� panic",
      "�� fall asleep",
      "�� build nests",
      "�� freeze solid"
    ],
    answer: 2,
    explanation: "�� ���� ���� ������ �дп� �����ٰ� �ߴ�."
  },
  "9. p5-no.30": {
    text: "When we have less, we tend to be more open to _____ what we have.",
    options: [
      "�� guarding",
      "�� hiding",
      "�� sharing",
      "�� selling",
      "�� wasting"
    ],
    answer: 3,
    explanation: "������ ���ϼ��� ���� ���� ������ �Ѵٰ� �����Ѵ�."
  },
  "10. p5-no.31": {
    text: "As humans, we _____?to new information and events both good and bad?and return to our personal default level of well-being.",
    options: [
      "�� complain",
      "�� predict",
      "�� adjust",
      "�� ignore",
      "�� accelerate"
    ],
    answer: 3,
    explanation: "����� ���ο� �Ͽ� ������ �⺻ �ູ �������� ���ư���."
  },
  "11. p5-no.32": {
    text: "This natural chemical builds up in your blood as time awake increases. While you sleep, your body _____ the adenosine.",
    options: [
      "�� hoards",
      "�� breaks down",
      "�� multiplies",
      "�� colors",
      "�� shares"
    ],
    answer: 2,
    explanation: "���� �ڴ� ���� �Ƶ������ �����Ѵٰ� �����Ѵ�."
  },
  "12. p6-no.33": {
    text: "If I care only about what minute the sun will rise tomorrow, then the number quoted here is _____.",
    options: [
      "�� useless",
      "�� fine",
      "�� dangerous",
      "�� hidden",
      "�� imaginary"
    ],
    answer: 2,
    explanation: "�뵵�� ���� ���� ��ġ�� ����� ��Ȯ�� �� �ִ�."
  },
  "13. p6-no.34": {
    text: "This transformation cannot happen without _____.",
    options: [
      "�� fossil fuels",
      "�� solar panels",
      "�� ancient myths",
      "�� volunteer labor",
      "�� instant teleportation"
    ],
    answer: 1,
    explanation: "��������� ��ȯ���� ȭ�����ᰡ �ʿ��ϴٰ� �����Ѵ�."
  },
  "14. p6-no.35": {
    text: "A few years later, MIT professor John McCarthy coined 'artificial intelligence,' replacing the previously used expression _____.",
    options: [
      "�� cosmic harmony",
      "�� automata studies",
      "�� musical chairs",
      "�� digital painting",
      "�� parallel poetry"
    ],
    answer: 2,
    explanation: "���� ��� automata studies�� AI�� �ٲپ��ٰ� �Ұ��Ѵ�."
  },
  "15. p6-no.36": {
    text: "The tortoise stocks up on water by eating plants and _____ to collect rain.",
    options: [
      "�� sculpting statues",
      "�� digging holes",
      "�� painting shells",
      "�� stretching legs",
      "�� humming songs"
    ],
    answer: 2,
    explanation: "�Ĺ��� ������ ��� ���� �����Ѵٰ� �����Ѵ�."
  },
  "16. p7-no.37": {
    text: "Because the brakes change your movement, making you slow down more suddenly, they must be exerting a force on the bicycle and you. This is the force called _____.",
    options: [
      "�� friction",
      "�� fusion",
      "�� expansion",
      "�� radiation",
      "�� levitation"
    ],
    answer: 1,
    explanation: "������ ������ �����Ű� ����ٰ� �����Ѵ�."
  },
  "17. p7-no.38": {
    text: "With nonlinear editing, shots and scenes can be easily added or removed anywhere in the program, and the computer _____ the program length automatically.",
    options: [
      "�� guesses",
      "�� adjusts",
      "�� ignores",
      "�� resists",
      "�� forgets"
    ],
    answer: 2,
    explanation: "���� ������ ���α׷� ���̸� �ڵ����� �����Ѵ�."
  },
  "18. p7-no.39": {
    text: "But actual _____ are important. A person who always tries to prevent harm but never does is not generally thought of as morally good.",
    options: [
      "�� schedules",
      "�� consequences",
      "�� costumes",
      "�� slogans",
      "�� invitations"
    ],
    answer: 2,
    explanation: "���� ����� �־�� ���������� ���ϴٰ� ����."
  },
  "19. p7-no.40": {
    text: "The functional relationship we have with objects creates visual expectations that _____ with our ability to see 'like a camera.'",
    options: [
      "�� harmonize",
      "�� interfere",
      "�� celebrate",
      "�� memorize",
      "�� applaud"
    ],
    answer: 2,
    explanation: "����� ���谡 ī�޶�ó�� ���������� ���� ���� �����Ѵ�."
  },
  "20. p8-no.41~42": {
    text: "'May I help you?' are the worst four words that a retail salesperson can utter because they don't encourage the customer to talk and put them on the _____.",
    options: [
      "�� stage",
      "�� defensive",
      "�� escalator",
      "�� headline",
      "�� mailing list"
    ],
    answer: 2,
    explanation: "�� ���� ���� ��������� ����ٰ� �ߴ�."
  },
  "21. p8-no.43~45": {
    text: "With a determined expression, he kept _____ pushing the dollar bill into the machine.",
    options: [
      "�� aimlessly",
      "�� proudly",
      "�� fearfully",
      "�� angrily",
      "�� secretly"
    ],
    answer: 1,
    explanation: "�ҳ��� ����� ǥ������ ��� ���� �־��ٰ� ����ȴ�."
  }
};
const TITLE_BANK = {
  "1. p2-no.18": {
    options: [
      "�� Extending Library Hours for Student Success",
      "�� Building a Brand-New School Auditorium",
      "�� Managing Noise Complaints in the Library",
      "�� Encouraging Students to Join Sports Clubs"
    ],
    answer: 1,
    explanation: "���� �ٽ��� ������ � �ð� ���� ��û�̴�."
  },
  "2. p2-no.19": {
    options: [
      "�� Waiting for the Wizard of Oz Call",
      "�� Practicing Piano with My Father",
      "�� Casting Spells on Stagehands",
      "�� Returning Costumes After the Show"
    ],
    answer: 1,
    explanation: "����� ��� ��ȭ�� ��ٸ��� �����̴�."
  },
  "3. p2-no.20": {
    options: [
      "�� Start Strong with a Classroom Warm-Up",
      "�� The Dangers of Arriving to Class Late",
      "�� How to Punish Distracted Students",
      "�� Turning Homework into Group Games"
    ],
    answer: 1,
    explanation: "���� ���� ��ƾ�� �߿伺�� �ٷ��."
  },
  "4. p3-no.21": {
    options: [
      "�� Borrowed Atoms in Our Bodies",
      "�� Why Stars Disappear Quickly",
      "�� The Secret Recipe for Making Gold",
      "�� How to Store Air in Your Lungs"
    ],
    answer: 1,
    explanation: "�츮 ���� ���ڰ� �󸶳� �����Ǿ����� �����Ѵ�."
  },
  "5. p3-no.22": {
    options: [
      "�� Gardening for Body and Mind",
      "�� Protecting Plants from Night Pests",
      "�� Building a Backyard Observatory",
      "�� Growing Vegetables without Water"
    ],
    answer: 1,
    explanation: "���� ���ٱ��� ��ü������ �ǰ� ȿ���� �����Ѵ�."
  },
  "6. p3-no.23": {
    options: [
      "�� Tools That Expand Human Senses",
      "�� Why Telescopes Are Dangerous",
      "�� The End of Scientific Instruments",
      "�� Learning to Ignore New Data"
    ],
    answer: 1,
    explanation: "������ �ΰ� ������ Ȯ���Ѵٰ� �����Ѵ�."
  },
  "7. p3-no.24": {
    options: [
      "�� Questioning Animal Experimentation's Impact",
      "�� Celebrating Every Laboratory Triumph",
      "�� Training Doctors to Handle Fewer Patients",
      "�� Teaching Pets to Perform Surgery"
    ],
    answer: 1,
    explanation: "��������� ���� ������ ������踦 �����Ѵ�."
  },
  "8. p5-no.29": {
    options: [
      "�� Why Gazelles Stayed Wild",
      "�� The Easiest Animals to Tame",
      "�� Building the Perfect Barn",
      "�� Gourmet Meals for Desert Creatures"
    ],
    answer: 1,
    explanation: "������ ����̱� ����� ������ �����Ѵ�."
  },
  "9. p5-no.30": {
    options: [
      "�� When Plenty Makes Us Stingy",
      "�� How to Host Endless Feasts",
      "�� Designing the Perfect Fence",
      "�� Tracking Travelers across the Desert"
    ],
    answer: 1,
    explanation: "ǳ������ ������ ���� ��Ȳ�� �ٷ��."
  },
  "10. p5-no.31": {
    options: [
      "�� Returning to Our Happiness Baseline",
      "�� Discovering the Saddest Song Ever",
      "�� Building a Toy Collection Forever",
      "�� Escaping from Every Emotion"
    ],
    answer: 1,
    explanation: "������ �⺻ �������� ���ƿ��� ������ �����Ѵ�."
  },
  "11. p5-no.32": {
    options: [
      "�� Why Your Body Demands Sleep",
      "�� Celebrating the Benefits of All-Nighters",
      "�� Designing the Perfect Bedroom Decor",
      "�� How Dreams Predict the Future"
    ],
    answer: 1,
    explanation: "�Ƶ������ ���� �䱸�ϴ� ������ �ٷ��."
  },
  "12. p6-no.33": {
    options: [
      "�� Precision Depends on Purpose",
      "�� Measuring the Sun Once and for All",
      "�� Mapping Every Street by Hand",
      "�� Counting Stars without Telescopes"
    ],
    answer: 1,
    explanation: "��Ȯ�Ǽ��� �ǹ̴� ������ ���� �޶�����."
  },
  "13. p6-no.34": {
    options: [
      "�� The Hidden Cost of Going Green",
      "�� Free Energy for Every Nation",
      "�� Why Oil Will Never Be Needed Again",
      "�� Teaching Children to Plant Trees"
    ],
    answer: 1,
    explanation: "������ ��ȯ�� ��� ���� ȭ������ ��� ������ �����Ѵ�."
  },
  "14. p6-no.35": {
    options: [
      "�� Dreaming of Thinking Machines",
      "�� Forgetting the Legends of Greece",
      "�� Acting Lessons for Artificial Actors",
      "�� How to Unplug Every Computer"
    ],
    answer: 1,
    explanation: "���ó�� �����ϴ� ��踦 �޲� ���縦 �Ұ��Ѵ�."
  },
  "15. p6-no.36": {
    options: [
      "�� How the Desert Tortoise Saves Water",
      "�� Teaching Pets to Swim in Sand",
      "�� Building a Turtle Water Park",
      "�� Why Rain Never Reaches Reptiles"
    ],
    answer: 1,
    explanation: "�縷 �ź��̰� ���� �����ϴ� ����� �����Ѵ�."
  },
  "16. p7-no.37": {
    options: [
      "�� Friction Slows You Down",
      "�� Riding with Rockets Every Morning",
      "�� Painting Bicycles for Fun",
      "�� The Secret Life of Brake Lights"
    ],
    answer: 1,
    explanation: "�������� �ӵ��� ���δٰ� �����Ѵ�."
  },
  "17. p7-no.38": {
    options: [
      "�� Editing Freedom in the Digital Era",
      "�� Why Tape Machines Are Faster",
      "�� Throwing Away Every Raw Footage",
      "�� Planning a Movie with Paper Only"
    ],
    answer: 1,
    explanation: "���� ������ ������ �ٷ��."
  },
  "18. p7-no.39": {
    options: [
      "�� Doing Good Requires Good Outcomes",
      "�� Let Intentions Handle Everything",
      "�� How to Ignore Other People",
      "�� Practicing Kindness Once a Year"
    ],
    answer: 1,
    explanation: "���� �ǵ��� ����� ��� �ʿ��ϴٰ� �����Ѵ�."
  },
  "19. p7-no.40": {
    options: [
      "�� Why We Can't See Like a Camera",
      "�� Building Better Digital Lenses",
      "�� Photographing Deserts at Night",
      "�� Teaching Robots to Blink"
    ],
    answer: 1,
    explanation: "����� ���԰��� �ð��� �����Ѵٰ� �����Ѵ�."
  },
  "20. p8-no.41~42": {
    options: [
      "�� A Better Way to Greet Customers",
      "�� How to Sell Only to Friends",
      "�� Closing Shops Earlier Every Day",
      "�� Designing Expensive Shopping Bags"
    ],
    answer: 1,
    explanation: "������ �λ� ��� ���� ������ �ʿ��ϴٴ� �����̴�."
  },
  "21. p8-no.43~45": {
    options: [
      "�� A Small Kindness at the Vending Machine",
      "�� Winning the Cafeteria Talent Show",
      "�� Planning a Prank on New Students",
      "�� Studying Alone in the Library"
    ],
    answer: 1,
    explanation: "���� ģ���� ���θ� �����ϴ� ����� �׸���."
  }
};
const THEME_BANK = {
  "1. p2-no.18": {
    options: [
      "�� �л����� �н��� ���� ���� ������ � �ð��� �÷� �޶�� ��û",
      "�� ������ ���� ������ �̿��� �����ؾ� �Ѵٴ� ����",
      "�� �л�ȸ���� �������� ���� ��� ����",
      "�� �б� ���� ��ȭ�� ���� ��Ģ �ȳ�"
    ],
    answer: 1,
    explanation: "��ü ���� ������ � �ð� ������ �䱸�Ѵ�."
  },
  "2. p2-no.19": {
    options: [
      "�� ������ �ӿ����� ������ �����ϰ� �� ����� ������ ȭ��",
      "�� �ƹ������� ���⸦ �׸��ζ�� �����ϴ� ��",
      "�� ģ���� ������ ���� ������ ��� ������",
      "�� ����� �غ� ��� �о��� ������ �л�"
    ],
    answer: 1,
    explanation: "����� ����� ��ٸ��� ������ �հ��� ����� �ٷ��."
  },
  "3. p2-no.20": {
    options: [
      "�� ���� ���� �ð��� ��ȹ������ Ȱ���ؾ� �Ѵٴ� ����",
      "�� �л����� ������ ������ �����ؾ� �Ѵٴ� ����",
      "�� ���� ȯ���� �ٹ̴� ��� �Ұ�",
      "�� ���� �� ü�� Ȱ���� �ؾ� �Ѵٴ� ����"
    ],
    answer: 1,
    explanation: "ù �� ���� ��ƾ�� ���� �����⸦ ����ٰ� �����Ѵ�."
  },
  "4. p3-no.21": {
    options: [
      "�� �츮�� ������ ���ڸ� �Բ� ���� ���� �ִٴ� ������",
      "�� �ΰ��� ������ ���ο� ���ڸ� ����� �� �� �ִٴ� Ȯ��",
      "�� ���ְ� �� ����� ���̶�� ���",
      "�� ���ڴ� �� �̻� �߿����� �ʴٴ� ����"
    ],
    answer: 1,
    explanation: "���ڴ� ��ȯ�ϸ� ��ΰ� �����Ѵٰ� �����Ѵ�."
  },
  "5. p3-no.22": {
    options: [
      "�� ���� ���ٱ�� ��ü�� ���� �ǰ� ��ο� ������ �ȴ�",
      "�� ���� ���ٱ�� ���� ����� ��� �δ㽺����",
      "�� ���� ���ٱ�� ���� ����� �� �� �ִ� Ȱ���̴�",
      "�� ���� ���ٱ�� ������� Ű��� �����̴�"
    ],
    answer: 1,
    explanation: "��� ������ ������ ������ ���� �����Ѵ�."
  },
  "6. p3-no.23": {
    options: [
      "�� ������ �ΰ��� ������ Ȯ���� ������ �ʴ� ������ ���� �ش�",
      "�� ������ ���� �ʴ� ���� ������ ��� �� ������ �ȴ�",
      "�� ����� �ڿ� ������ �ְ��ϹǷ� ����� �ٿ��� �Ѵ�",
      "�� �ΰ� ������ �Ϻ��ϴ� ������ �ʿ� ����"
    ],
    answer: 1,
    explanation: "���� ������ ���� Ȯ�� ����� �����Ѵ�."
  },
  "7. p3-no.24": {
    options: [
      "�� ������谡 �ΰ������ �����Ǵ� ������ ����ؾ� �Ѵ�",
      "�� ���������� ���� ������ ���������� �ʿ��ϴ�",
      "�� ���������� �̹� ������� �ִٴ� ���",
      "�� ���� ������ ���ſ� ������ ����"
    ],
    answer: 1,
    explanation: "���� �䱸�� ���� ������踦 �ΰ��� �����ϸ� �� �ȴٰ� ����Ѵ�."
  },
  "8. p5-no.29": {
    options: [
      "�� �� ���� ���� ������ ����̱� ��ƴ�",
      "�� ��� �ʽĵ����� ���� ��鿩����",
      "�� �ΰ��� ����� ����� �Ѵ�",
      "�� �߻������� ������ �츮�� ���´�"
    ],
    answer: 1,
    explanation: "������ ���� ��� ����̱� ������� �����Ѵ�."
  },
  "9. p5-no.30": {
    options: [
      "�� ǳ������ ������ ������ ��ư� ���� �� �ִ�",
      "�� �����ϸ� ���� ���� �ʰ� �ȴ�",
      "�� ���ڴ� ��� ������ ����",
      "�� �����ڴ� ������ �����ڴ븦 ���Ѵ�"
    ],
    answer: 1,
    explanation: "ǳ������ ���� ����� ������ ���δٰ� �����Ѵ�."
  },
  "10. p5-no.31": {
    options: [
      "�� ����� ���� �ϰ� ���� �� ��ο� �����Ѵ�",
      "�� ������ �� �� ����� ������ �����ȴ�",
      "�� ���̵��� �峭���� �ݹ� ���� ���Ѵ�",
      "�� ����� ���ĺ��� �� ���� �������"
    ],
    answer: 1,
    explanation: "������ �ᱹ �⺻ �������� ���ƿ´ٰ� ���Ѵ�."
  },
  "11. p5-no.32": {
    options: [
      "�� �Ƶ���� ������ ���� �ʿ伺�� �˷� �ش�",
      "�� ������ ���ϸ� ���� �ʿ� ����",
      "�� ������ �ǰ��� �����ϴ�",
      "�� ���� ���̸� ���꼺�� ��������"
    ],
    answer: 1,
    explanation: "������ �ٰŷ� ������ �ʿ並 �����Ѵ�."
  },
  "12. p6-no.33": {
    options: [
      "�� ��Ȯ�Ǽ��� �ǹ̴� Ȱ�� ������ ���� �޶�����",
      "�� ���ڴ� ������ ������ ��ġ�� ���Ѵ�",
      "�� ��Ȯ���� �ϻ��Ȱ�� �ʿ� ����",
      "�� �������� ���� �� ������ ������ �Ѵ�"
    ],
    answer: 1,
    explanation: "��Ȯ�� �Ǵ��� ��Ȳ�� ���� �޶����� �����Ѵ�."
  },
  "13. p6-no.34": {
    options: [
      "�� ��������� ��ȯ���� ���� ���� ȭ������ ����� ������",
      "�� ��������� ��ȯ�� ���� ����� ���� �ʴ´�",
      "�� ȭ������� �̹� �������",
      "�� ������ ��ȯ�� ����� �����ϴ�"
    ],
    answer: 1,
    explanation: "��ȯ ���� �ڿ� ������ �Բ� ����ؾ� ���� �����Ѵ�."
  },
  "14. p6-no.35": {
    options: [
      "�� �ΰ��� ���������� ������ ��踦 �޲� �Դ�",
      "�� �ΰ������� �ֱ� ���ڱ� ������ �߸��̴�",
      "�� ���� ���� ���ó�� ������ �� ����",
      "�� ��ȭ�� ������ ���� ������� �ʴ´�"
    ],
    answer: 1,
    explanation: "���� �ӿ��� AI ������ ������ �Դٰ� �����Ѵ�."
  },
  "15. p6-no.36": {
    options: [
      "�� �縷 �ź��̴� �汤�� �̿��� ���� �����Ѵ�",
      "�� �ź��̴� �� ������ ���Ѵ�",
      "�� ����� ���� ���̴� ������ �� ����",
      "�� �ź��̴� ������ ���� �ٴٷ� �̵��Ѵ�"
    ],
    answer: 1,
    explanation: "�汤�� ���� �����ϹǷ� �Ժη� ���� ����� ����Ѵ�."
  },
  "16. p7-no.37": {
    options: [
      "�� �������� ��ü�� ��� ������ �����",
      "�� ���� ������ �׻� �ӵ��� ���δ�",
      "�� �����Ŵ� ���� ��� ��� �޸���",
      "�� �극��ũ�� ��Ŀ� ��ġ��"
    ],
    answer: 1,
    explanation: "�����°� ���� ������ �ӵ��� ������ �����Ѵ�."
  },
  "17. p7-no.38": {
    options: [
      "�� ���� ������ ���ϴ� ����� �����Ӱ� ������ �� �ְ� �Ѵ�",
      "�� �ʸ� ������ ���� ������ ȿ�����̴�",
      "�� ���� ������ ���������θ� �����ϴ�",
      "�� ���� ������ ȿ���� ���� �� ����"
    ],
    answer: 1,
    explanation: "������ ������ ������ �Ұ��Ѵ�."
  },
  "18. p7-no.39": {
    options: [
      "�� ���������� ���Ϸ��� �ǵ��� ����� ��� �߿��ϴ�",
      "�� ���� ������ ������ ����ϴ�",
      "�� �쿬�� ���� ����� ���� �׻� ���ϴ�",
      "�� ����� ���� �߿����� �ʴ�"
    ],
    answer: 1,
    explanation: "���� �ǵ��� ������ ����� ��� �����Ѵ�."
  },
  "19. p7-no.40": {
    options: [
      "�� ����� ���谡 �ð��� ���԰��� �����",
      "�� ������ ������ �ְ��Ѵ�",
      "�� �ΰ��� ���� ������ �������̴�",
      "�� �繰�� ��ɰ� �����ϰ� ���δ�"
    ],
    answer: 1,
    explanation: "���ǰ��� ���谡 �ν� ����� �¿��Ѵٰ� ���Ѵ�."
  },
  "20. p8-no.41~42": {
    options: [
      "�� �������� �������� ���� ��ȭ�� ���� ����ϰ� �Ѵ�",
      "�� ���� ������ ���� ������ �ʴ´�",
      "�� �Ǹſ��� ���� ���̴� ���� ����",
      "�� �λ�� ������ ������ �Ѵ�"
    ],
    answer: 1,
    explanation: "���� ������ �Ǹſ� �����ϴٰ� �����Ѵ�."
  },
  "21. p8-no.43~45": {
    options: [
      "�� ���� ģ���� ���Ⱑ ���ο��� ū ���ΰ� �ȴ�",
      "�� �Ǽ��� �л����� ���� �ִ� ����̴�",
      "�� ģ���� ��� ����ִٴ� �̾߱��",
      "�� ȥ�� �ִ� �л��� �׻� �����ϴ�"
    ],
    answer: 1,
    explanation: "������ ����� ������ ���ϴ� �̾߱��."
  }
};
const IMPLICIT_BANK = {
  "1. p2-no.18": {
    text: "This change would greatly benefit students by providing additional time to focus on their academic goals. I hope you will consider this proposal as a step toward improving our academic environment and <u>better supporting our needs</u>.",
    options: [
      "�� �л����� �䱸�� �� �� ���� �޶�� ���̴�.",
      "�� ������ ��� ü������ ����϶�� �ǹ̴�.",
      "�� �����н��� �ߴ��ϰڴٴ� �ǵ���.",
      "�� �������� ����ص� �����ٴ� �����̴�.",
      "�� �л�ȸ���� �����ϰڴٴ� �Ͻô�."
    ],
    answer: 1,
    explanation: "�л����� ���ϴ� �н� ȯ���� ������ �޶�� �ǹ̴�."
  },
  "2. p2-no.19": {
    text: "He announced, \"That was The Wizard of Oz. You're second senior munchkin.\" I got a little rush of excitement, knowing <u>I was in ? that whatever happened I could be involved in one of the productions</u>.",
    options: [
      "�� � �����̵� ���뿡 �� ��ȸ�� ����ٴ� ���̴�.",
      "�� �̹� ������ �������� �ʰڴٴ� ���̴�.",
      "�� ������� �ٽ� ���� �Ѵٴ� �뺸��.",
      "�� ���Ⱑ�� Ȱ���ϰ� �Ǿ��ٴ� �ǹ̴�.",
      "�� �ٸ� �ش����� �ű��� �䱸��."
    ],
    answer: 1,
    explanation: "�������ζ� ������ �����ϰ� �Ǿ��ٴ� ����� �巯����."
  },
  "3. p2-no.20": {
    text: "If you are prepared for class and have taught your students an opening routine, they can use this brief time to <u>make mental and emotional transitions</u> from the last class and prepare to focus on learning new material.",
    options: [
      "�� �ռ� �������� ���ο� �������� ������ ������ �ű�ٴ� ���̴�.",
      "�� ���� ���� ������ ��� �ؾ������ �Ѵٴ� �ǹ̴�.",
      "�� �л��鿡�� �޽��� ��� �־�� �Ѵٴ� ���̴�.",
      "�� �л��鿡�� ������ ����� �Ϸ��� �ǵ���.",
      "�� ���� �� ����� ����� �϶�� ���ô�."
    ],
    answer: 1,
    explanation: "���� �������� ��� �� ������ �����ϵ��� ���´ٴ� �ǹ̴�."
  },
  "4. p3-no.21": {
    text: "You're the present caretaker of the atoms in your body. There will be many who will follow you, because we all <u>borrow</u> the same atoms.",
    options: [
      "�� ��� �þ� �ξ��ٰ� �ٸ� ������ �Űܰ��ٴ� ���̴�.",
      "�� ���ڸ� ������ ������ �� �ִٴ� �ǹ̴�.",
      "�� ���ο� ���ڸ� ����� �� �� �ִٴ� ���̴�.",
      "�� ���ڸ� ������ ������ٴ� ���̴�.",
      "�� ���ڸ� �ٽ� �ǵ��� ���� �� ���ٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "���ڴ� ��� ����ϴ� ���̸� ������ �ٸ� ���翡�� ���ٴ� �ǹ̴�."
  },
  "5. p3-no.22": {
    text: "The sense of accomplishment from watching your plants grow and thrive can also <u>boost self-esteem and overall well-being</u>.",
    options: [
      "�� �ڽŰ��� �������� �ູ���� ���� �شٴ� ���̴�.",
      "�� �������� ������� �ǹ̴�.",
      "�� �ǰ��� ��ģ�ٴ� ����.",
      "�� �ٸ� ��̸� �����϶�� ���̴�.",
      "�� ���� ������ �����ϴٴ� ǥ���̴�."
    ],
    answer: 1,
    explanation: "���� ���ٱⰡ �ڽŰ��� ���̰� �ູ���� �شٴ� �ǹ̴�."
  },
  "6. p3-no.23": {
    text: "Some of these take the form of expanding the reach of our current senses, such as <u>creating visible images based on the ultraviolet spectrum of light</u>.",
    options: [
      "�� ���� ������ �ʴ� ������ ������ �� �� �ְ� �� �شٴ� ���̴�.",
      "�� ���� ���� ��� ���� ���ٴ� �ǹ̴�.",
      "�� ���� ���� ������� �ʴ´ٴ� ���̴�.",
      "�� ������ �ٿ��� �Ѵٴ� �����̴�.",
      "�� �ڿ��� ���� ���ְڴٴ� �����̴�."
    ],
    answer: 1,
    explanation: "������ �ʴ� �ڿܼ� ������ ����ȭ�Ѵٴ� ���̴�."
  },
  "7. p3-no.24": {
    text: "The correlation between animal experimentation and medical discovery is the result of <u>legal necessity</u>, not evidence that animal experimentation led to medical advances.",
    options: [
      "�� �� ���� ������ ��¿ �� ���� ��Ÿ�� ������ ���̴�.",
      "�� ������ ���� �ʿ� �����ٴ� ���̴�.",
      "�� ���� ��� �߸��Ǿ��ٴ� �����̴�.",
      "�� �ǻ���� ���� �����Ѵٴ� �ǹ̴�.",
      "�� ������ �ҹ��̶�� �ǹ̴�."
    ],
    answer: 1,
    explanation: "���� �䱸�ؼ� ���� ��������� ���� �����Ѵ�."
  },
  "8. p5-no.29": {
    text: "Just imagine trying to herd an animal that runs away, <u>blindly hits itself against walls</u>, can leap up to nearly 30 feet, and can run at a speed of 50 miles per hour!",
    options: [
      "�� �̿� ���� ���� ���� ���� ä �ε����ٴ� ���̴�.",
      "�� ���� ��Ȯ�� ����� �پ�Ѵ´ٴ� �ǹ̴�.",
      "�� ���� �׸��� �׸��ٴ� ǥ���̴�.",
      "�� ���� ���� �㹮�ٴ� ���̴�.",
      "�� ���� �����Ѵٴ� ǥ���̴�."
    ],
    answer: 1,
    explanation: "�η������� ���� �ε��� ��ĥ ������ ũ�ٴ� �ǹ̴�."
  },
  "9. p5-no.30": {
    text: "Our desire for more, combined with our decreased physical interaction with the 'common folk,' starts to create a <u>disconnection</u> or blindness to reality.",
    options: [
      "�� ����� �������� �Ÿ��� �������ٴ� ���̴�.",
      "�� ��ο� �� ��������ٴ� �ǹ̴�.",
      "�� ������ �� �� ���ٴ� ���̴�.",
      "�� ������� ������ ��ô�϶�� ���̴�.",
      "�� ���ڰ� �Ǵ� ���� �Ұ����ϴٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "������ �پ��� ���ǰ� �����ȴٴ� �ǹ̴�."
  },
  "10. p5-no.31": {
    text: "Like water seeking its own level, we are pulled toward our <u>baseline</u> ? back up after bad news and back down after good.",
    options: [
      "�� �⺻���� �ູ �������� ���ư��ٴ� ���̴�.",
      "�� ���ο� ������ ��� �����Ѵٴ� �ǹ̴�.",
      "�� ������ ������ ������ٴ� ���̴�.",
      "�� �ٸ� ����� ����� �����Ѵٴ� ���̴�.",
      "�� ��ݸ� ����� ������ ���شٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "�ᱹ ������ �ູ �������� ���ƿ´ٴ� �ǹ̴�."
  },
  "11. p5-no.32": {
    text: "Because of such built-in molecular feedback, <u>you can't become accustomed to getting less sleep than your body needs</u>.",
    options: [
      "�� ���� �ʿ�� �ϴ� ���� ���̸� �ᱹ �Ѱ谡 �´ٴ� ���̴�.",
      "�� ���� ���ϼ��� �� �ǰ������ٴ� �ǹ̴�.",
      "�� ���� ���̸� ���ο� ������ ����ٴ� ���̴�.",
      "�� ���� ���̸� ���� �� �ٰ� �ȴٴ� ���̴�.",
      "�� ���� ���̸� ���� �ð��� �þ�ٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "���� ���̸� ���� �ᱹ �ٽ� ������ ���� ä��� �Ѵٴ� �ǹ̴�."
  },
  "12. p6-no.33": {
    text: "If the next digit is uncertain, that means the uncertainty in knowing the precise Earth-sun distance is <u>larger than the distance between New York and Chicago</u>!",
    options: [
      "�� ���� ������ ����� ũ�ٴ� ���̴�.",
      "�� ���� �� �Ÿ��� �ǹ� ���ٴ� ���̴�.",
      "�� ������ �¾� �Ÿ��� ���ú��� �����ٴ� �ǹ̴�.",
      "�� ���� �̸��� �����ؾ� �Ѵٴ� �����̴�.",
      "�� ����⸦ Ÿ�߸� �Ѵٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "������ ���� ���� �Ÿ����� ũ�ٴ� ���� �����Ѵ�."
  },
  "13. p6-no.34": {
    text: "Heinberg remarks that the cost of building this new energy infrastructure is <u>seldom counted in transition proposals</u>.",
    options: [
      "�� ��ȯ ��ȹ�� ���� ����� ���� �ݿ����� �ʴ´ٴ� ���̴�.",
      "�� ��ȯ ����� ����� ����Ѵٴ� �ǹ̴�.",
      "�� ���簡 �ʹ� ���� ����� ���� �ʴ´ٴ� ���̴�.",
      "�� ��ȹ�� ��� ��ҵǾ��ٴ� ���̴�.",
      "�� ���� ����� �����ȴٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "��ȯ ����� �����򰡵ǰ� ������ �����Ѵ�."
  },
  "14. p6-no.35": {
    text: "Since then, artificial intelligence has become the study and practice of 'making intelligent machines' that are <u>programmed to think like humans</u>.",
    options: [
      "�� �ΰ�ó�� ����ϵ��� ����ȴٴ� ���̴�.",
      "�� �ΰ��� ������ ���شٴ� �ǹ̴�.",
      "�� ��ǻ�͸� ��� �ı��Ѵٴ� ���̴�.",
      "�� ����� ����� ������ �����ٴ� ���̴�.",
      "�� �ΰ��� ������ �����ȴٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "��谡 �ΰ��� ����ϰ� ����ϵ��� ����� ������� �ǹ̴�."
  },
  "15. p6-no.36": {
    text: "Tortoises become so terrified when people pick them up that <u>they empty their bladders, losing their precious water reserves</u>.",
    options: [
      "�� ��� �տ� �鸮�� ������ ���� ������ �ȴٴ� ���̴�.",
      "�� ����� ������ ���� ���� �شٴ� �ǹ̴�.",
      "�� �汤�� �ʿ� ���ٴ� ���̴�.",
      "�� �ź��̰� ���� ������ �ʴ´ٴ� ���̴�.",
      "�� �ź��̰� �� ��� �𷡸� ���Ŵٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "�ǵ帮�� ���� ���� ������ �������� �� ������ ���Ѵ�."
  },
  "16. p7-no.37": {
    text: "Another is air resistance, which you can feel, <u>pushing you backwards</u> as you and the bicycle move forwards.",
    options: [
      "�� ���� ������ �ڿ��� �о� �ӵ��� ���δٴ� ���̴�.",
      "�� ���Ⱑ �տ��� ���� �شٴ� �ǹ̴�.",
      "�� ���Ⱑ �׻� ���� �شٴ� ���̴�.",
      "�� ���Ⱑ ���Ը� ���δٴ� ���̴�.",
      "�� ���⸦ ���ø� �ӵ��� �������ٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "���� ������ ���� ����� �ݴ�� �ۿ��Ѵٴ� �ǹ̴�."
  },
  "17. p7-no.38": {
    text: "Linear editing was like composing a paper on a typewriter. If a mistake was made or new information needed to be added the whole piece had to be retyped. Nonlinear editing, on the other hand, is like using a word processing program. If a mistake is made, it is easily deleted and fixed with a few keystrokes, and new information can be added easily. �� �������� <u>nonlinear editing</u>�� ������ ���ϴ°�?",
    options: [
      "�� ��ǻ�ͷ� ���� �������߰��� �� �ִ� ���� ���",
      "�� ���̷θ� �۾��ؾ� �ϴ� ���",
      "�� ��ȭ�� �� ���� �Կ��ؾ� �ϴ� ��Ģ",
      "�� ������ ������ �����ڴ� ����",
      "�� Ÿ�ڱ⸦ ���� ��� �Ѵٴ� �ǹ�"
    ],
    answer: 1,
    explanation: "���� ������ ��ǻ�� ������� ���� ���� �������� ������ ���̴�."
  },
  "18. p7-no.39": {
    text: "Of such a person, it may be said that she means well; but, contrary to Kant, <u>some results are necessary before she is regarded as morally good</u>.",
    options: [
      "�� ������ ���� ����� �־�� ���������� ���ϴٰ� �������ٴ� ���̴�.",
      "�� ����� ������� �ǵ��� ������ �ȴٴ� �ǹ̴�.",
      "�� ĭƮ�� ������ �״�� �����ٴ� ���̴�.",
      "�� ����� ���ڸ� �ǵ��� ��� �ȴٴ� ���̴�.",
      "�� Ÿ���� ����� ��������� �ǹ̴�."
    ],
    answer: 1,
    explanation: "���� �ǵ� �ܿ��� ���� ����� �ʿ����� �����Ѵ�."
  },
  "19. p7-no.40": {
    text: "In viewing a scene, we establish unconscious hierarchies that reflect our functional relationship to objects and our momentary priorities. �̶� <u>unconscious hierarchies</u>�� �ǹ��ϴ� ����?",
    options: [
      "�� ���ǽ������� ��� �߽����� �繰�� �߿䵵�� ���� �迭�ϴ� ��",
      "�� �ǽ������� ���ڸ� ���� ��",
      "�� ������ ������ �ϴ� �µ�",
      "�� �繰�� ���� �ν����� ���ϴ� ����",
      "�� ��ü�� ��� ���� ũ��� ���ٴ� ����"
    ],
    answer: 1,
    explanation: "���ǽ������� ��ɿ� ���� �ð��� �켱������ ���Ѵٴ� �ǹ̴�."
  },
  "20. p8-no.41~42": {
    text: "This line is a <u>rote approach</u> that is so overused by untrained and uninterested salespeople.",
    options: [
      "�� ���� ���� ����ó�� �ݺ��Ǵ� ���̶�� ���̴�.",
      "�� â�����̰� ���Ӵٴ� �ǹ̴�.",
      "�� ������ ������ �شٴ� ���̴�.",
      "�� �Ǹſ��� ���θ� ���ƴٴ� �ǹ̴�.",
      "�� �Ǹſ��� ������ �����϶�� ���̴�."
    ],
    answer: 1,
    explanation: "���������� �ݺ��Ǵ� �������� ��Ʈ��� �ǹ̴�."
  },
  "21. p8-no.43~45": {
    text: "As I walked away from my lunch table that day, I looked at Dave. I thought <u>he and the dollar were very much alike</u>.",
    options: [
      "�� �� �� ���� �޾Ƶ鿩���� ���ߴٴ� ���̴�.",
      "�� �� �� �����̶�� �ǹ̴�.",
      "�� �� �� ����δٴ� ���̴�.",
      "�� �� �� �Ҿ���ȴٴ� ���̴�.",
      "�� �� �� ������ٴ� �ǹ̴�."
    ],
    answer: 1,
    explanation: "�ҳ�� ���� ��� �޾Ƶ鿩���� �������� �ᱹ ���ڸ��� ã�� �Ǹ��� ����� �巯����."
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
    const blankProblems = [];
    const titleProblems = [];
    const themeProblems = [];
    const implicitProblems = [];
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
          mainText: questionText,
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

      // Blank
      const blankInfo = BLANK_BANK[source];
      if (blankInfo) {
        blankProblems.push({
          type: 'blank',
          question: '���� ���� ��ĭ�� �� ���� ���� ������ ����?',
          mainText: passage,
          blankText: blankInfo.text,
          options: blankInfo.options,
          answer: String(blankInfo.answer),
          explanation: blankInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'blank', source, reason: '��ĭ ������ ����' });
      }
      // Title
      const titleInfo = TITLE_BANK[source];
      if (titleInfo) {
        titleProblems.push({
          type: 'title',
          question: '���� ���� �������� ���� ������ ����?',
          mainText: passage,
          options: titleInfo.options,
          answer: String(titleInfo.answer),
          explanation: titleInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'title', source, reason: '���� ������ ����' });
      }

      // Theme
      const themeInfo = THEME_BANK[source];
      if (themeInfo) {
        themeProblems.push({
          type: 'theme',
          question: '���� ���� ������ ���� ������ ����?',
          mainText: passage,
          options: themeInfo.options,
          answer: String(themeInfo.answer),
          explanation: themeInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'theme', source, reason: '���� ������ ����' });
      }

      // Implicit meaning
      const implicitInfo = IMPLICIT_BANK[source];
      if (implicitInfo) {
        implicitProblems.push({
          type: 'implicit',
          question: '���� �ۿ��� ���� ģ �κ��� ���� ������ �ǹ��ϴ� ����?',
          mainText: implicitInfo.text,
          options: implicitInfo.options,
          answer: String(implicitInfo.answer),
          explanation: implicitInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1,
            originalPassage: passage
          }
        });
      } else {
        failures.push({ type: 'implicit', source, reason: '���� �ǹ� ������ ����' });
      }
    });

    const output = {
      documentTitle: parsed.title,
      generatedAt: new Date().toISOString(),
      counts: {
        grammar: grammarProblems.length,
        vocabulary: vocabularyProblems.length,
        summary: summaryProblems.length,
        blank: blankProblems.length,
        title: titleProblems.length,
        theme: themeProblems.length,
        implicit: implicitProblems.length
      },
      grammar: grammarProblems,
      vocabulary: vocabularyProblems,
      summary: summaryProblems,
      blank: blankProblems,
      title: titleProblems,
      theme: themeProblems,
      implicit: implicitProblems,
      failures
    };

    fs.writeFileSync('generated_full_problem_set.json', JSON.stringify(output, null, 2), 'utf8');
    console.log(`Generated grammar:${grammarProblems.length}, vocabulary:${vocabularyProblems.length}, summary:${summaryProblems.length}, blank:${blankProblems.length}, title:${titleProblems.length}, theme:${themeProblems.length}, implicit:${implicitProblems.length}. Failures: ${failures.length}`);
  } catch (error) {
    console.error('Failed to generate full problem set:', error);
    process.exit(1);
  }
})();
