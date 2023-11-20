/* eslint-disable no-console */
import React, { useEffect, useRef, useState } from 'react'

import { IdlePromise } from '../../src'

const WHILE_LIMIT = 1e9

function IdlePromisePage() {
  const [mounted, setMounted] = useState(false)
  const [runCount, setRunCount] = useState(1)
  const targetRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef<() => Promise<any>>()

  function isDisabledIdle() {
    const params = new URLSearchParams(location.search)
    return params.get('idle') === '0'
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }
    const params = new URLSearchParams(location.search)
    const disabledIdle = params.get('idle') === '0'

    if (disabledIdle) {
      const start = Date.now()
      console.log('blocking start')
      let count = 0
      while (count <= WHILE_LIMIT) {
        count += 1
        continue
      }
      console.log('result', count)
      console.log('blocking end', Date.now() - start)
      setRunCount((prev) => (prev += 1))
    } else {
      let idleStart = Date.now()
      console.log('blocking start')
      const idlePromise = new IdlePromise<number>(function* (resolve) {
        let count = 0
        let chunkStart = Date.now()
        while (count <= WHILE_LIMIT) {
          count += 1
          if (Date.now() >= chunkStart + 45) {
            console.log('blocking end', Date.now() - idleStart)
            yield
            chunkStart = Date.now()
            idleStart = Date.now()
            console.log('blocking start')
          }
          continue
        }
        resolve(count)
      })
      finishRef.current = idlePromise.finish

      idlePromise
        .then((result) => {
          console.log('result', result)
        })
        .finally(() => {
          setRunCount((prev) => (prev += 1))
        })
    }
  }, [mounted, runCount])

  useEffect(() => {
    if (!mounted) {
      return
    }

    let translateX = 0
    let dir: 'left' | 'right' = 'left'
    const step = 2

    const run = () => {
      if (!targetRef.current) {
        return
      }
      if (translateX >= window.innerWidth / 2) {
        dir = 'right'
      }
      if (translateX <= 0) {
        dir = 'left'
      }

      translateX = dir === 'left' ? translateX + step : translateX - step

      targetRef.current.style.transform = `translateX(${translateX}px)`
      requestAnimationFrame(() => run())
    }

    requestAnimationFrame(() => run())

    console.log('targetRef', targetRef.current)
  }, [mounted])

  if (!mounted) {
    return null
  }

  return (
    <div className='m-2'>
      <h1>
        {isDisabledIdle() ? 'Idle disabled' : 'Idle working...'} ({runCount})
      </h1>
      <textarea className='p-1 border' />
      <div>
        <button
          className='border'
          onClick={() => {
            if (isDisabledIdle()) {
              window.open(`${location.origin}${location.pathname}`, '_blank')
            } else {
              window.open(
                `${location.origin}${location.pathname}?idle=0`,
                '_blank',
              )
            }
          }}
        >
          open {isDisabledIdle() ? 'idle working' : 'idle disabled'} page
        </button>
        {!isDisabledIdle() && (
          <button
            className='border'
            onClick={async () => {
              if (finishRef.current) {
                console.log(
                  '🚀 ~ file: idle-promise$.tsx:132 ~ onClick={ ~ finishRef.current:',
                  finishRef.current,
                )
                const result = await finishRef.current()
                console.log(
                  '🚀 ~ file: idle-promise$.tsx:131 ~ onClick={ ~ result:',
                  result,
                )
              }
            }}
          >
            finish idle promise
          </button>
        )}
      </div>
      <div className='w-full'>
        <div ref={targetRef} className='w-6 h-6 bg-cyan-500 rounded-full' />
      </div>
    </div>
  )
}

export default IdlePromisePage
