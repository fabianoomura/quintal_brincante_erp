import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparObservacoesInmet, classificarClimaInmet } from './inmet'

test('classifica o clima por precipitação e nebulosidade', () => {
  assert.equal(classificarClimaInmet(25, 100), 'tempestade')
  assert.equal(classificarClimaInmet(4, 100), 'chuva')
  assert.equal(classificarClimaInmet(0.5, 100), 'garoa')
  assert.equal(classificarClimaInmet(0, 85), 'nublado')
  assert.equal(classificarClimaInmet(0, 45), 'sol_entre_nuvens')
  assert.equal(classificarClimaInmet(0, 10), 'sol')
  assert.equal(classificarClimaInmet(null, null), null)
})

test('agrupa observações horárias no dia local e calcula temperatura média', () => {
  const resultado = agruparObservacoesInmet([
    { name: 'air_temperature', reportTime: '2026-08-10T12:00:00Z', value: 18 },
    { name: 'air_temperature', reportTime: '2026-08-10T18:00:00Z', value: 26 },
    { name: 'cloud_cover_total', reportTime: '2026-08-10T12:00:00Z', value: 50 },
    { name: 'cloud_cover_total', reportTime: '2026-08-10T18:00:00Z', value: 100 },
    { name: 'total_precipitation_or_total_water_equivalent', reportTime: '2026-08-10T18:00:00Z', value: 0 },
    { name: 'air_temperature', reportTime: '2026-08-11T01:00:00Z', value: 22 },
  ])

  assert.deepEqual(resultado, [{
    data: '2026-08-10',
    clima: 'nublado',
    temperaturaMedia: 22,
  }])
})
