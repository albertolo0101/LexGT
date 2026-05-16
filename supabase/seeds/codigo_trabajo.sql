-- ============================================================
-- SEED: Código de Trabajo de Guatemala (Decreto 1441)
-- Estructura real, texto placeholder — contenido completo en Phase 11
-- ============================================================

-- 1. Ley
INSERT INTO laws (id, slug, short_name, full_name, decree, enacted_on) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'codigo-trabajo',
  'Código de Trabajo',
  'Código de Trabajo de Guatemala',
  'Decreto 1441',
  '1961-05-01'
);

-- ============================================================
-- 2. Secciones — Libro I completo
-- ============================================================

-- Libro I
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', NULL, 'libro', 'LIBRO PRIMERO', 'PARTE GENERAL', 1);

-- Título I (artículos directamente bajo el título — sin capítulos)
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'titulo', 'TITULO I', 'PRINCIPIOS FUNDAMENTALES', 1);

-- Título II
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'titulo', 'TITULO II', 'DE LOS INDIVIDUOS DEL DERECHO DEL TRABAJO', 2);

-- Título II → Capítulo I
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'capitulo', 'CAPITULO I', 'DE LOS TRABAJADORES', 1);

-- Título II → Capítulo II
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'capitulo', 'CAPITULO II', 'DE LOS PATRONOS', 2);

-- Título III
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'titulo', 'TITULO III', 'DEL CONTRATO INDIVIDUAL DE TRABAJO', 3);

-- Título III → Capítulo I
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', 'capitulo', 'CAPITULO I', 'DEL CONTRATO INDIVIDUAL DE TRABAJO', 1);

-- Título III → Capítulo II
INSERT INTO sections (id, law_id, parent_id, kind, number, heading, position) VALUES
('b1000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', 'capitulo', 'CAPITULO II', 'DE LAS JORNADAS DE TRABAJO Y DE LOS DESCANSOS', 2);

-- ============================================================
-- 3. Artículos y párrafos
-- Artículos 1–5 → Título I (Principios fundamentales)
-- Artículos 6–10 → Capítulo I, Título II (Trabajadores)
-- Artículos 11–15 → Capítulo II, Título II (Patronos)
-- Artículos 16–20 → Capítulo I, Título III (Contrato)
-- Los triggers de search_vector se ejecutan automáticamente al insertar.
-- ============================================================

-- --- Artículos 1–5: Principios fundamentales ---

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '1', 'Objeto del Código', 1, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 1, 'El presente Código regula los derechos y obligaciones de patronos y trabajadores, con ocasión del trabajo, y crea instituciones para resolver sus conflictos.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '2', 'Principio tutelar', 2, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 1, 'Las normas del presente Código y de sus reglamentos son de orden público y a sus disposiciones deben sujetarse todas las empresas de cualquier naturaleza que operen en el territorio de la República de Guatemala.'),
('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 2, 'Son nulos ipso jure y no obligan a los contratantes, todos los actos o estipulaciones que impliquen renuncia, disminución o tergiversación de los derechos que la Constitución de la República, el presente Código, sus reglamentos y las demás leyes y disposiciones de trabajo otorguen a los trabajadores.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '3', 'Irrenunciabilidad de derechos', 3, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000003', 1, 'El trabajador no puede renunciar a los derechos que le confiere este Código. Todo convenio o contrato que implique renuncia, disminución o tergiversación de derechos reconocidos por la ley en favor del trabajador será nulo ipso jure.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '4', 'Interpretación de las normas laborales', 4, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000004', 1, 'Los casos no previstos en este Código, en sus reglamentos o en las demás leyes relativas al trabajo, se deben resolver, en primer término, de acuerdo con los principios del derecho del trabajo; en segundo lugar, de acuerdo con la equidad, la costumbre o el uso locales, en armonía con dichos principios; y por último, de acuerdo con los principios y leyes del derecho común.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '5', 'Igualdad de trato', 5, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000005', 1, 'El trabajador tiene derecho a ser tratado con igualdad, sin distinción de sexo, raza, religión, ideología política u origen social, en relación con la retribución, las condiciones de trabajo y las posibilidades de ascenso y capacitación profesional.');

-- --- Artículos 6–10: De los trabajadores ---

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', '6', 'Definición de trabajador', 1, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000006', 1, 'Trabajador es toda persona individual que presta a un patrono sus servicios materiales, intelectuales o de ambos géneros, en virtud de un contrato o relación de trabajo.'),
('b3000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000006', 2, 'El trabajador debe prestar sus servicios con la diligencia y cuidado que correspondan a las obligaciones de su puesto.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', '7', 'Trabajador del campo', 2, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000009', 'b2000000-0000-0000-0000-000000000007', 1, 'Trabajador del campo es toda persona que realiza su actividad laboral en faenas propias de la agricultura, ganadería y actividades conexas. Goza de las mismas garantías generales que los demás trabajadores, con las modalidades propias de las labores rurales.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', '8', 'Trabajador doméstico', 3, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000010', 'b2000000-0000-0000-0000-000000000008', 1, 'Trabajador doméstico es el que se dedica en forma habitual y continua a labores de aseo, asistencia y demás propias de un hogar o de otro sitio de residencia o habitación particular, que no importen lucro o negocio para el empleador o sus familiares.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', '9', 'Trabajador de confianza', 4, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000011', 'b2000000-0000-0000-0000-000000000009', 1, 'Trabajador de confianza es el que tiene intervención en la dirección, fiscalización, inspección, asesoría o administración de los negocios del patrono, o que presta servicios especiales de confianza.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', '10', 'Derechos del trabajador', 5, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000012', 'b2000000-0000-0000-0000-000000000010', 1, 'El trabajador tiene derecho a un salario justo y suficiente que cubra sus necesidades normales de orden material, moral y cultural y que le permita satisfacer sus deberes como jefe de familia.'),
('b3000000-0000-0000-0000-000000000013', 'b2000000-0000-0000-0000-000000000010', 2, 'Asimismo, el trabajador tiene derecho a condiciones de trabajo que no menoscaben su salud, su dignidad o impidan el normal desarrollo de la persona.');

-- --- Artículos 11–15: De los patronos ---

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '11', 'Definición de patrono', 1, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000014', 'b2000000-0000-0000-0000-000000000011', 1, 'Patrono es toda persona individual o jurídica que utiliza los servicios de uno o más trabajadores, en virtud de un contrato o relación de trabajo.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '12', 'Obligaciones del patrono', 2, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000015', 'b2000000-0000-0000-0000-000000000012', 1, 'El patrono está obligado a pagar el salario convenido, a proporcionar las condiciones de seguridad e higiene en el trabajo, y a cumplir con todas las demás obligaciones que este Código y sus reglamentos le impongan.'),
('b3000000-0000-0000-0000-000000000016', 'b2000000-0000-0000-0000-000000000012', 2, 'El patrono debe respetar la libertad sindical del trabajador y abstenerse de realizar cualquier acto que pudiera disminuir sus derechos colectivos.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '13', 'Representante del patrono', 3, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000017', 'b2000000-0000-0000-0000-000000000013', 1, 'Son representantes del patrono y en tal concepto lo obligan frente a los trabajadores: los directores, gerentes, administradores, capitanes de barco y en general las personas que ejercen funciones de dirección o administración en la empresa.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '14', 'Patrono sustituto', 4, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000018', 'b2000000-0000-0000-0000-000000000014', 1, 'En caso de sustitución de patrono, el que sustituye queda obligado por todas las obligaciones laborales pendientes del sustituido. El trabajador podrá considerarse despedido si la sustitución implica menoscabo de sus condiciones de trabajo.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '15', 'Solidaridad del patrono', 5, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000019', 'b2000000-0000-0000-0000-000000000015', 1, 'Cuando un patrono opere mediante intermediario o contratista, ambos responden solidariamente ante el trabajador por las obligaciones laborales derivadas de la prestación de los servicios.');

-- --- Artículos 16–20: Del contrato individual de trabajo ---

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000007', '16', 'Definición de contrato de trabajo', 1, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000020', 'b2000000-0000-0000-0000-000000000016', 1, 'Contrato individual de trabajo, sea cual fuere su denominación, es el vínculo económico-jurídico mediante el que una persona (trabajador), queda obligada a prestar a otra (patrono), sus servicios personales o a ejecutarle una obra, personalmente, bajo la dependencia continuada y dirección inmediata o delegada de esta última, a cambio de una retribución de cualquier clase o forma.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000007', '17', 'Presunción de contrato', 2, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000021', 'b2000000-0000-0000-0000-000000000017', 1, 'El hecho de la prestación de servicios personales ante un patrono hace presumir la existencia de un contrato de trabajo entre quien los presta y quien los recibe. En consecuencia, quien niega la existencia de la relación laboral tiene la carga de la prueba en contrario.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000007', '18', 'Contratos por tiempo indefinido', 3, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000022', 'b2000000-0000-0000-0000-000000000018', 1, 'El contrato de trabajo puede celebrarse por tiempo indefinido, por tiempo determinado o para la ejecución de obra determinada. En caso de duda, se presume celebrado por tiempo indefinido, lo que implica mayor estabilidad y garantías para el trabajador.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000007', '19', 'Requisitos del contrato', 4, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000023', 'b2000000-0000-0000-0000-000000000019', 1, 'Todo contrato individual de trabajo debe contener: designación de las partes y su domicilio; fecha de inicio; duración; tipo de trabajo; lugar de prestación; salario convenido, forma y período de pago; y demás estipulaciones lícitas que acuerden las partes.'),
('b3000000-0000-0000-0000-000000000024', 'b2000000-0000-0000-0000-000000000019', 2, 'La falta de contrato escrito no priva al trabajador de sus derechos ni exime al patrono de sus obligaciones, dado que los derechos del trabajador tienen rango constitucional y son irrenunciables.');

INSERT INTO articles (id, law_id, section_id, number, heading, position, is_current, version) VALUES
('b2000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000007', '20', 'Período de prueba', 5, true, 1);
INSERT INTO paragraphs (id, article_id, position, text) VALUES
('b3000000-0000-0000-0000-000000000025', 'b2000000-0000-0000-0000-000000000020', 1, 'Durante los primeros dos meses de una relación de trabajo, cualquiera de las partes puede darla por terminada sin responsabilidad de su parte. Transcurrido dicho período, el contrato se considera perfeccionado y sólo podrá darse por terminado por las causas establecidas en este Código.');
