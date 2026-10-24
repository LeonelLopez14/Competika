<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../core/validar.php';
require_once __DIR__ . '/../core/api_exception.php';
require_once __DIR__ . '/../model/resultado.php';
require_once __DIR__ . '/../model/partido.php';
require_once __DIR__ . '/../service/tabla_posiciones.php';
require_once __DIR__ . '/../model/torneo.php';
require_once __DIR__ . '/../model/configuracion_torneo.php';
require_once __DIR__ . '/../model/equipo.php';
require_once __DIR__ . '/../model/solicitud_juez.php';

class ValidacionesTest extends TestCase
{
    public function testPasswordValidaNoLanzaError(): void
    {
        Validar::password('clave1234');
        $this->assertTrue(true);
    }

    public function testPasswordSinNumerosLanzaError(): void
    {
        $this->expectException(ApiException::class);
        Validar::password('sololetras');
    }

    public function testEquipoGanadorSumaTresPuntos(): void
    {
        $resultado = Resultado::jugado(1, 2, 3, 1);
        $partido = new Partido(id: null, torneoId: 10, localId: 1, visitanteId: 2, fecha: null, ubicacion: null, resultado: $resultado);
        $tabla = TablaPosiciones::calcular([1, 2], [$partido]);
        $this->assertSame(3, $tabla[1]['pts']);
        $this->assertSame(0, $tabla[2]['pts']);
    }

    public function testEmpateSumaUnPuntoACadaEquipo(): void
    {
        $resultado = Resultado::jugado(1, 2, 2, 2);
        $partido = new Partido(id: null, torneoId: 10, localId: 1, visitanteId: 2, fecha: null, ubicacion: null, resultado: $resultado);
        $tabla = TablaPosiciones::calcular([1, 2], [$partido]);
        $this->assertSame(1, $tabla[1]['pts']);
        $this->assertSame(1, $tabla[2]['pts']);
    }

    public function testTorneoActivoNoEstaOculto(): void
    {
        $torneo = new Torneo(1, 'Copa Test', 1);
        $torneo->setEstado(Torneo::ACTIVO);
        $this->assertFalse($torneo->estaOculto());
    }

    public function testTorneoEnRevisionEstaOculto(): void
    {
        $torneo = new Torneo(1, 'Copa Test', 1);
        $torneo->setEstado(Torneo::EN_REVISION);
        $this->assertTrue($torneo->estaOculto());
    }

        public function testSolicitudJuezValidaNoLanzaError(): void
    {
        $solicitud = SolicitudJuez::desdeFormulario('12345678', ['deportes' => 'Futbol', 'experiencia' => 'Arbitre cinco anios en ligas locales de futbol amateur.']);
        $this->assertSame('Futbol', $solicitud->getDeportes());
    }

    public function testSolicitudJuezConExperienciaCortaLanzaError(): void
    {
        $this->expectException(ApiException::class);
        SolicitudJuez::desdeFormulario('12345678', ['deportes' => 'Futbol', 'experiencia' => 'Poca.']);
    }

    public function testCantidadDeJugadoresValidaNoLanzaError(): void
    {
        $resultado = Equipo::validarJugadores(11);
        $this->assertSame(11, $resultado);
    }

    public function testCantidadDeJugadoresFueraDeRangoLanzaError(): void
    {
        $this->expectException(ApiException::class);
        Equipo::validarJugadores(0);
    }

    public function testFechaYHoraValidasDePartido(): void
    {
        $resultado = Partido::fechaDesde('2026-03-01', '15:30');
        $this->assertSame('2026-03-01 15:30:00', $resultado);
    }

    public function testHoraInvalidaDePartidoLanzaError(): void
    {
        $this->expectException(ApiException::class);
        Partido::fechaDesde('2026-03-01', '25:99');
    }

        public function testResultadoConGanadorQuedaFinalizado(): void
    {
        $resultado = Resultado::jugado(1, 2, 3, 1);
        $this->assertSame('finalizado', $resultado->getEstado());
        $this->assertSame(1, $resultado->getGanadorEquipoId());
    }

    public function testResultadoConMismoPuntajeEsEmpate(): void
    {
        $resultado = Resultado::jugado(1, 2, 2, 2);
        $this->assertSame('empate', $resultado->getEstado());
        $this->assertNull($resultado->getGanadorEquipoId());
    }
}