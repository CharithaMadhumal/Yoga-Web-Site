import React from 'react'
import HeroContainer from './Hero/HeroContainer'
import Gallery from './Gallery/Gallery'

export default function Home() {
  return (
    <section>
      <HeroContainer />
      <div className='max-w-screen-xl mx-auto'>
        <Gallery />
      </div>
    </section>
  )
}
