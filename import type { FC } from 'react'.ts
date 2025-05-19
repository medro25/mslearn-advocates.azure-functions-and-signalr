import type { FC } from 'react'
import { useMemo, useRef } from 'react'
import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { dtcBreakpoints } from '@constants/breakpoints'
import { fontSize, spacing, zIndex } from '@constants/constants'
import { ElementSizes, gutter } from '@constants/grid'
import useProductFromSysId from '@hooks/useProductFromSysId'
import DtcBadge from '@src/components/common/badge/DtcBadge'
import ContentBlock, {
  ContentBlockSizes,
  type ContentBlockSize,
} from '@src/components/common/ContentBlock'
import Cta from '@src/components/common/cta/Cta'
import Cell from '@src/components/common/grid/Cell'
import FluidContainer from '@src/components/common/grid/FluidContainer'
import Row from '@src/components/common/grid/Row'
import PricingInfo from '@src/components/common/pricing/PricingInfo'
import SubThemeContainer from '@src/components/common/SubThemeContainer'
import AdjustableHeading from '@src/components/styled/AdjustableHeading'
import AdjustableText from '@src/components/styled/AdjustableText'
import { animationHandlerMap, TextAnimations } from '@src/sections/AnimatedContent/animations'
import { themeColors } from '@theme/constants'
import { setCursorCoordinatesOnMouseOver } from '@utils/cta'
import { getLowestPricedVariant } from '@utils/pricing'
import type DtcBadgeType from '@src/components/common/badge/BadgeType'
import type { AnimationHandlerProps } from '@src/sections/AnimatedContent/animations'
import type { AnimatedContentFragment } from '@type/graphql'

const colOffset = {
  start: 0,
  center: 2,
  end: 5,
}

const AnimatedContent: FC<AnimatedContentFragment & { className?: string }> = ({
  content,
  animation,
  forceLtr,
  ctaCollection,
  position,
  inverseColors,
  badgesCollection,
  contentSize,
  product,
  className,
  initialCss,
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const alignment = position && colOffset.hasOwnProperty(position) ? position : 'start'
  const offset = colOffset[alignment]
  const elementSize = contentSize === 'xlarge' ? ElementSizes.Large : ElementSizes.Base
  const shouldRunAnimations = useRef<boolean>(true)

  const { variantPricing } = useProductFromSysId(product?.sys.id)
  const defaultVariant = useMemo(() => getLowestPricedVariant(variantPricing), [variantPricing])

  useGSAP(() => {
    if (headingRef.current && contentRef.current && animation && shouldRunAnimations.current) {
      const params: AnimationHandlerProps = {
        heading: headingRef.current,
        content: contentRef.current,
        actions: buttonsRef.current,
        callback: () => {
          shouldRunAnimations.current = false;
        },
        timeline: gsap.timeline(),
        forceLtr,
      };

      if (animation in TextAnimations) {
        setTimeout(() => {
          animationHandlerMap[animation](params);
        }, 500);
      }
    }
  }, []);

  if (!content) {
    return null
  }

  const { heading, semanticHeadingLevel, headingSize, contentCollection } = content

  return (
    <SubThemeContainer
      component={AnimatedContentContainer}
      inverse={!!inverseColors}
      className={className}
      initialLoad={shouldRunAnimations.current}
      initialCss={initialCss}
    >
      <Row>
        <Cell cols={{ xs: 12, md: 12, lg: 9, xl: 7 }} offset={{ md: offset }}>
          {heading?.text && (
            <StyledHeading
              semanticLevel={semanticHeadingLevel || 2}
              display={headingSize ?? 'h1'}
              headingSize={headingSize}
              ref={headingRef}
              size={ContentBlockSizes[contentSize as ContentBlockSize]}
            >
              {heading.text}
            </StyledHeading>
          )}
        </Cell>
      </Row>
      <ContentContainer>
        <Cell cols={{ xs: 12, md: alignment === 'center' ? 7 : 6 }} offset={{ md: offset + 1 }}>
          <Content as="div" size={ElementSizes.Large} ref={contentRef}>
            {!!badgesCollection?.items?.length && (
              <BadgeContainer>
                {badgesCollection.items.map((badge, index) => (
                  <DtcBadge
                    key={index}
                    pill={badge?.pill}
                    badgeType={badge?.badgeType as DtcBadgeType}
                  >
                    {badge?.label?.text}
                  </DtcBadge>
                ))}
              </BadgeContainer>
            )}
            <ContentBlock
              contentCollection={contentCollection}
              size={contentSize as ContentBlockSize}
              allowedSizes={[
                ContentBlockSizes.xlarge,
                ContentBlockSizes.large,
                ContentBlockSizes.base,
              ]}
              defaultSize={ContentBlockSizes.large}
            />
            {defaultVariant && (
              <PricingInfo
                size={elementSize}
                productIdentifiers={(defaultVariant.sku && [{ sku: defaultVariant.sku }]) || null}
                currentPrice={defaultVariant.salePrice}
                oldPrice={defaultVariant.basePrice}
                showTradeInText={true}
              />
            )}
          </Content>
        </Cell>
      </ContentContainer>
      {!!ctaCollection?.items?.length && (
        <Row rowRef={buttonsRef}>
          <Cell cols={{ xs: 12, md: 7 }} offset={{ md: offset }}>
            <SharedWidthWrapper>
              {ctaCollection.items.map(
                (cta, index) =>
                  cta &&
                  (typeof cta?.show === 'boolean' ? cta.show : true) && (
                    <StyledCta
                      {...cta}
                      key={index}
                      size={elementSize}
                      onMouseOver={
                        cta.variant ? (e) => setCursorCoordinatesOnMouseOver(e) : undefined
                      }
                    />
                  )
              )}
            </SharedWidthWrapper>
          </Cell>
        </Row>


      )}
    </SubThemeContainer>
  )
}

export default AnimatedContent

const StyledHeading = styled(AdjustableHeading, {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'headingSize',
}) <{
  size: ContentBlockSizes
  headingSize?: string | null
}>`
  margin-block-end: 0.375em;
  ${({ headingSize, size }) =>
    !headingSize && `font-size: ${size === ContentBlockSizes.base ? fontSize(8) : fontSize(9)};`}
  font-kerning: none;

  > span {
    overflow-y: hidden;

    html[dir='rtl'] & {
      text-align: right !important;
    }
  }
`

const ContentContainer = styled(Row)`
  margin-block-start: auto;
`

const SharedWidthWrapper = styled.div`
  display: grid;
  grid-auto-flow: column;         
  grid-auto-columns: 1fr;         
  gap: ${spacing(175)};
`

const Content = styled(AdjustableText)`
  display: flex;
  flex-direction: column;
  row-gap: ${spacing(100)};
  margin-block-end: ${spacing(150)};
  font-kerning: none;
`

const BadgeContainer = styled.div`
  display: flex;
  gap: ${gutter.xs};
  flex-wrap: wrap;
`

const AnimatedContentContainer = styled(FluidContainer, {
  shouldForwardProp: (prop) => prop !== 'initialCss' && prop !== 'initialLoad',
}) <{
  initialCss?: string | null
  initialLoad?: boolean
}>`
  display: flex;
  flex-direction: column;
  row-gap: 0.375em;
  position: relative;

  ${({ initialLoad }) => {
    return (
      initialLoad &&
      `
  ${StyledHeading}, ${Content}, 
       .cta-wrapper > button,
      .cta-wrapper > a {
       visibility: hidden;;
      }
      `
    )
  }}
  ${({ initialCss }) => initialCss}
`

const StyledCta = styled(Cta)`
  width: 100%;
  
  display: flex;              
  justify-content: center;     
  align-items: center;        
  text-align: center;
  gap: 0.5rem; 

  ${({ variant }) => {
    if (!variant) {
      return ''
    }

    const inverseButton = variant === 'solid' ? 'inverse' : 'primary'
    const textColor = themeColors.text[variant === 'solid' ? 'primary' : 'inverse']

    return css`
      transition: background-color 0.05s ease-in 0.05s;

      @media (max-width: ${dtcBreakpoints.xs.maxWidth}) {
        word-wrap: break-word;
        white-space: normal;
        text-align: center;
      }

      &::after {
        content: '';
        z-index: ${zIndex.BEHIND};
        position: absolute;
        inset: var(--cursor-y, 0) auto auto var(--cursor-x, 0);
        translate: -50% -50%;
        scale: 0;
        width: 210%;
        aspect-ratio: 1;
        background-color: ${themeColors.button[inverseButton]?.default};
        border-radius: 100vmax;
        transition:
          scale 0.3s ease-in-out,
          color 0.3s ease;
      }

      &:hover {
        color: ${textColor};
        background-color: ${themeColors.button[inverseButton]?.default};
        transition: background-color 0.05s ease-out 0.15s;

        &:focus {
          color: ${textColor};
        }

        &::after {
          scale: 1;
        }
      }
    `
  }}
`
