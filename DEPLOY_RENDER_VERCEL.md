# Deploy: Render (Server) + Vercel (Client)

������ �Ǽ��񽺷� �ø� �� ���� ���� ���̵��Դϴ�. **Render Starter �÷� + ��ũ**�� �⺻���� ����ؿ�.

## 0) ���� �غ�
- GitHub ����� ����: JaekwonJo/league-of-english
- OPENAI_API_KEY �غ�

## 1) Render ���� ���� (Starter �÷�)
1. Render ? New ? Blueprint ? �� ����Ҹ� �����ؿ�.
2. ��Ʈ�� �ִ� ender.yaml�� �ڵ����� �����ſ�. Starter �÷� �����񽺰� �ٷ� �����˴ϴ�.
3. ȯ�� ���� Ȯ��/�߰�:
   - OPENAI_API_KEY: ���� Ű �Է�
   - JWT_SECRET: blueprint�� �ڵ� ���� (�ʿ��ϸ� ���� ����)
   - DB_FILE: /var/data/loe.db (�̹� blueprint�� ����)
4. Disk ����� /var/data�� 1GB�� �پ��. ���п� SQLite(DB)�� ����� �Ŀ��� ��Ƴ����ϴ�.
5. ù ���� �Ϸ� �� ���� URL(��: https://loe-server.onrender.com)�� ������ּ���.

?? �ｺüũ: GET https://<render-url>/health ? { status: 'OK' }

## 2) Vercel Ŭ���̾�Ʈ ����
1. GitHub ������Ʈ�� �����Ϳ�.
2. Root Directory: client
3. Build Command: 
pm run build
4. Output Directory: uild
5. Environment Variables:
   - REACT_APP_API_URL = https://<render-service-domain>/api
6. Deploy�� ������ �ֽ� Ŭ���̾�Ʈ�� Render API�� �ٶ󺾴ϴ�.

## 3) ��ü �÷ο� ����
1. Vercel URL�� �����ؿ�.
2. �α���: dmin / admin123
3. ���� ���� ? 3�� ���� ���� ���� ? ���� ? ��� ȭ�鿡�� ����/Ƽ�� Ȯ��.

## 4) � ��
- Ŀ���� �������� �ִٸ� Render�� Vercel ������ �����ϰ�, REACT_APP_API_URL�� �ٲ� �ּ���.
- CORS�� ��װ� �ʹٸ� Render�� CORS_ORIGIN(��ǥ ����) ȯ�� ������ �߰��ؿ�.

## ����: Free �÷����� ���� ���� �ʿ��� ��
- ������ ������ �߿����� ���� ������, plan: free + DB_FILE=/tmp/loe.db + ��ũ ���� ���·� ���� YAML�� ����� ����� �� �־��.
- ������ ���/�α׸� �������� Starter �̻� �÷��� ���� ��õ�մϴ�.
