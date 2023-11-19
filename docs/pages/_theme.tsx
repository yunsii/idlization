/* eslint-disable react/prop-types */
import './global.css'

import React from 'react'
import { createTheme, defaultSideNavs } from 'vite-pages-theme-doc'

import Component404 from './404'

import type { Theme } from 'vite-plugin-react-pages'

const SiteTheme: Theme = (props) => {
  const { loadedData, loadState } = props

  const DocTheme = createTheme({
    logo: <div style={{ fontSize: '20px' }}>idlization</div>,
    topNavs: [
      {
        label: 'idlization',
        href: 'https://github.com/yunsii/idlization',
      },
    ],
    sideNavs: (ctx) => {
      return defaultSideNavs(ctx, {
        groupConfig: {
          components: {
            'demos': {
              label: 'Demos (dev only)',
              order: -1,
            },
            'general': {
              label: 'General',
              order: 1,
            },
            'data-display': {
              label: 'Data Display',
              order: 2,
            },
          },
        },
      })
    },
    Component404,
  })

  return <DocTheme loadedData={loadedData} loadState={loadState} />
}

export default SiteTheme
