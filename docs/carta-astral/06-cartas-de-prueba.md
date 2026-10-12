# 06 · Cartas de prueba para comparar con astro.com

Cinco personas **ficticias** (el repo es público: aquí nunca van datos de clientes reales). Cada caso trae los datos de entrada y lo que calcula el sistema (`calcularCarta`), para compararlo a mano contra astro.com.

## Cómo comparar en astro.com

1. Entra a astro.com → *Horóscopos gratis* → *Dibujo de carta, ascendente* → introduce los datos de nacimiento (ciudad y país, no hace falta cuenta). Los nombres de los menús pueden variar un poco.
2. En *Selección de carta extendida* (opciones), elige: zodíaco **tropical**, sistema de casas **Placidus**, **nodo verdadero**, y agrega **Quirón** a los objetos adicionales.
3. Compara signo y grado de cada punto. **Tolerancia: ±0°06' en planetas y ±0°30' en cúspides** (el plan pide ±0,1° y ±0,5°). Una diferencia de 1° o más en el Ascendente casi siempre es una hora o una zona horaria mal convertida.
4. Anota abajo el resultado de cada comparación (`[ ]` → `[x]`).

> Las posiciones se calcularon con Swiss Ephemeris (modo interno Moshier para Sol–Plutón) y ya se cruzaron en las pruebas automáticas contra un segundo motor independiente. Esta comparación manual es el último control antes de lanzar.

## Caso 1 — Bogotá, con horario de verano (1992)

- **Entrada:** 1992-09-20, 14:45 hora local, Bogotá, Colombia (4.711, -74.0721), zona `America/Bogota`
- **Hora UTC calculada:** 1992-09-20 18:45:00 UTC
- **Casas:** Placidus · **Fase lunar:** Cuarto menguante

| Punto | Signo | Posición | Casa | Rx |
| --- | --- | --- | --- | --- |
| Sol | Virgo | 28°03' | 9 |  |
| Luna | Cáncer | 10°11' | 6 |  |
| Mercurio | Libra | 2°45' | 9 |  |
| Venus | Libra | 24°39' | 9 |  |
| Marte | Cáncer | 4°45' | 6 |  |
| Júpiter | Virgo | 25°45' | 8 |  |
| Saturno | Acuario | 12°21' | 1 | R |
| Urano | Capricornio | 14°03' | 12 | R |
| Neptuno | Capricornio | 16°12' | 12 | R |
| Plutón | Escorpio | 20°53' | 10 |  |
| Quirón | Leo | 18°53' | 7 |  |
| Nodo Norte (verdadero) | Sagitario | 25°54' | 11 | R |
| Nodo Sur | Géminis | 25°54' | 5 | R |
| Ascendente | Capricornio | 23°23' | 1 |  |
| Medio Cielo | Libra | 29°08' | 10 |  |

Cúspides: 1: 23°23' Capricornio · 2: 24°01' Acuario · 3: 26°47' Piscis · 4: 29°08' Aries · 5: 28°45' Tauro · 6: 26°04' Géminis · 7: 23°23' Cáncer · 8: 24°01' Leo · 9: 26°47' Virgo · 10: 29°08' Libra · 11: 28°45' Escorpio · 12: 26°04' Sagitario

- [ ] Comparado con astro.com: coincide dentro de la tolerancia

## Caso 2 — Buenos Aires, hemisferio sur (1985)

- **Entrada:** 1985-03-02, 03:20 hora local, Buenos Aires, Argentina (-34.6037, -58.3816), zona `America/Argentina/Buenos_Aires`
- **Hora UTC calculada:** 1985-03-02 06:20:00 UTC
- **Casas:** Placidus · **Fase lunar:** Gibosa creciente

| Punto | Signo | Posición | Casa | Rx |
| --- | --- | --- | --- | --- |
| Sol | Piscis | 11°37' | 2 |  |
| Luna | Cáncer | 8°03' | 6 |  |
| Mercurio | Piscis | 21°12' | 3 |  |
| Venus | Aries | 19°49' | 4 |  |
| Marte | Aries | 20°32' | 4 |  |
| Júpiter | Acuario | 5°14' | 1 |  |
| Saturno | Escorpio | 28°06' | 11 |  |
| Urano | Sagitario | 17°48' | 11 |  |
| Neptuno | Capricornio | 3°18' | 12 |  |
| Plutón | Escorpio | 4°35' | 10 | R |
| Quirón | Géminis | 3°30' | 5 |  |
| Nodo Norte (verdadero) | Tauro | 20°59' | 4 | R |
| Nodo Sur | Escorpio | 20°59' | 10 | R |
| Ascendente | Capricornio | 29°15' | 1 |  |
| Medio Cielo | Libra | 18°00' | 10 |  |

Cúspides: 1: 29°15' Capricornio · 2: 21°04' Acuario · 3: 16°45' Piscis · 4: 18°00' Aries · 5: 23°29' Tauro · 6: 28°21' Géminis · 7: 29°15' Cáncer · 8: 21°04' Leo · 9: 16°45' Virgo · 10: 18°00' Libra · 11: 23°29' Escorpio · 12: 28°21' Sagitario

- [ ] Comparado con astro.com: coincide dentro de la tolerancia

## Caso 3 — Caracas, época de UTC−4:30 (2012)

- **Entrada:** 2012-06-01, 23:10 hora local, Caracas, Venezuela (10.4806, -66.9036), zona `America/Caracas`
- **Hora UTC calculada:** 2012-06-02 03:40:00 UTC
- **Casas:** Placidus · **Fase lunar:** Gibosa creciente

| Punto | Signo | Posición | Casa | Rx |
| --- | --- | --- | --- | --- |
| Sol | Géminis | 12°01' | 4 |  |
| Luna | Escorpio | 9°24' | 9 |  |
| Mercurio | Géminis | 18°59' | 4 |  |
| Venus | Géminis | 18°10' | 4 | R |
| Marte | Virgo | 15°12' | 7 |  |
| Júpiter | Tauro | 27°48' | 3 |  |
| Saturno | Libra | 23°12' | 8 | R |
| Urano | Aries | 7°52' | 2 |  |
| Neptuno | Piscis | 3°09' | 1 |  |
| Plutón | Capricornio | 8°56' | 11 | R |
| Quirón | Piscis | 9°42' | 1 |  |
| Nodo Norte (verdadero) | Sagitario | 5°05' | 10 |  |
| Nodo Sur | Géminis | 5°05' | 4 |  |
| Ascendente | Acuario | 24°17' | 1 |  |
| Medio Cielo | Sagitario | 1°15' | 10 |  |

Cúspides: 1: 24°17' Acuario · 2: 28°59' Piscis · 3: 2°03' Tauro · 4: 1°15' Géminis · 5: 27°47' Géminis · 6: 24°27' Cáncer · 7: 24°17' Leo · 8: 28°59' Virgo · 9: 2°03' Escorpio · 10: 1°15' Sagitario · 11: 27°47' Sagitario · 12: 24°27' Capricornio

- [ ] Comparado con astro.com: coincide dentro de la tolerancia

## Caso 4 — Madrid (1978)

- **Entrada:** 1978-11-23, 07:05 hora local, Madrid, España (40.4168, -3.7038), zona `Europe/Madrid`
- **Hora UTC calculada:** 1978-11-23 06:05:00 UTC
- **Casas:** Placidus · **Fase lunar:** Cuarto menguante

| Punto | Signo | Posición | Casa | Rx |
| --- | --- | --- | --- | --- |
| Sol | Sagitario | 0°35' | 1 |  |
| Luna | Virgo | 4°33' | 10 |  |
| Mercurio | Sagitario | 21°06' | 2 |  |
| Venus | Escorpio | 7°55' | 12 | R |
| Marte | Sagitario | 15°26' | 1 |  |
| Júpiter | Leo | 9°03' | 9 |  |
| Saturno | Virgo | 13°02' | 10 |  |
| Urano | Escorpio | 17°34' | 1 |  |
| Neptuno | Sagitario | 17°23' | 2 |  |
| Plutón | Libra | 18°13' | 11 |  |
| Quirón | Tauro | 6°19' | 6 | R |
| Nodo Norte (verdadero) | Virgo | 24°18' | 10 |  |
| Nodo Sur | Piscis | 24°18' | 4 |  |
| Ascendente | Escorpio | 16°54' | 1 |  |
| Medio Cielo | Leo | 27°12' | 10 |  |

Cúspides: 1: 16°54' Escorpio · 2: 16°36' Sagitario · 3: 21°04' Capricornio · 4: 27°12' Acuario · 5: 29°25' Piscis · 6: 25°35' Aries · 7: 16°54' Tauro · 8: 16°36' Géminis · 9: 21°04' Cáncer · 10: 27°12' Leo · 11: 29°25' Virgo · 12: 25°35' Libra

- [ ] Comparado con astro.com: coincide dentro de la tolerancia

## Caso 5 — Sídney, cruce de año (1999)

- **Entrada:** 1999-12-31, 23:55 hora local, Sídney, Australia (-33.8688, 151.2093), zona `Australia/Sydney`
- **Hora UTC calculada:** 1999-12-31 12:55:00 UTC
- **Casas:** Placidus · **Fase lunar:** Cuarto menguante

| Punto | Signo | Posición | Casa | Rx |
| --- | --- | --- | --- | --- |
| Sol | Capricornio | 9°23' | 4 |  |
| Luna | Escorpio | 1°41' | 1 |  |
| Mercurio | Capricornio | 0°24' | 4 |  |
| Venus | Sagitario | 0°24' | 2 |  |
| Marte | Acuario | 27°13' | 6 |  |
| Júpiter | Aries | 25°13' | 7 |  |
| Saturno | Tauro | 10°25' | 8 | R |
| Urano | Acuario | 14°46' | 6 |  |
| Neptuno | Acuario | 3°10' | 5 |  |
| Plutón | Sagitario | 11°25' | 3 |  |
| Quirón | Sagitario | 11°30' | 3 |  |
| Nodo Norte (verdadero) | Leo | 4°00' | 11 | R |
| Nodo Sur | Acuario | 4°00' | 5 | R |
| Ascendente | Virgo | 21°31' | 1 |  |
| Medio Cielo | Géminis | 24°55' | 10 |  |

Cúspides: 1: 21°31' Virgo · 2: 2°14' Escorpio · 3: 1°25' Sagitario · 4: 24°55' Sagitario · 5: 17°40' Capricornio · 6: 14°21' Acuario · 7: 21°31' Piscis · 8: 2°14' Tauro · 9: 1°25' Géminis · 10: 24°55' Géminis · 11: 17°40' Cáncer · 12: 14°21' Leo

- [ ] Comparado con astro.com: coincide dentro de la tolerancia
